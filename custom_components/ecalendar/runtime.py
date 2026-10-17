"""MQTT event transport. ESP is authoritative; no event copies are persisted."""
import asyncio
import copy
import json
import math
import re
import uuid
from datetime import date, datetime, timezone
from homeassistant.components import mqtt
from homeassistant.core import callback
from .const import TIMEOUT, VERSION, MEASUREMENT_TIMEOUT

class CalendarError(Exception):
    """A user-readable operation failure."""


def validate_add(data):
    name = data.get("name", "").strip()
    if not name or len(name.encode("utf-8")) > 160:
        raise CalendarError("Nazwa musi mieć od 1 do 160 bajtów (polskie litery zajmują więcej niż jeden).")
    values = [data.get(k) for k in ("year", "month", "day", "advance_days")]
    if any(type(value) is not int for value in values):
        raise CalendarError("Data i liczba dni muszą być liczbami całkowitymi.")
    year, month, day, advance = values
    try:
        date(year, month, day)
    except ValueError as exc:
        raise CalendarError("Nieprawidłowa data.") from exc
    if not 2000 <= year <= 2099 or not 0 <= advance <= 7:
        raise CalendarError("Wybierz rok 2000–2099 i przypomnienie od 0 do 7 dni wcześniej.")
    repeat = data.get("repeat", 0)
    occurrence = data.get("monthly_occurrence", 1)
    weekday = data.get("monthly_weekday", 1)
    anniversary = data.get("anniversary", False)
    anniversary_base = data.get("anniversary_base", 0)
    if any(type(value) is not int for value in (repeat, occurrence, weekday, anniversary_base)) or type(anniversary) is not bool:
        raise CalendarError("Nieprawidłowy typ opcji powtarzania lub rocznicy.")
    if not 0 <= repeat <= 4 or not 1 <= occurrence <= 5 or not 0 <= weekday <= 6 or not 0 <= anniversary_base <= 250:
        raise CalendarError("Nieprawidłowe opcje powtarzania lub wartość rocznicy (0–250).")
    if anniversary and repeat != 3:
        raise CalendarError("Obliczanie wieku lub rocznicy wymaga powtarzania co rok.")
    short_month = data.get("short_month_last_day", False)
    if type(short_month) is not bool or (short_month and repeat not in (2, 3)):
        raise CalendarError("Opcja ostatniego dnia miesiąca wymaga powtarzania co miesiąc lub co rok.")
    time_minutes = data.get("time_minutes", -1)
    if type(time_minutes) is not int or not -1 <= time_minutes <= 1439:
        raise CalendarError("Nieprawidłowa godzina wydarzenia.")
    result = dict(name=name, year=year, month=month, day=day, advance_days=advance,
                repeat=repeat, monthly_occurrence=occurrence if repeat == 4 else 1,
                monthly_weekday=weekday if repeat == 4 else 1,
                anniversary=anniversary, anniversary_base=anniversary_base if anniversary else 0)
    if "short_month_last_day" in data:
        result["short_month_last_day"] = short_month
    if time_minutes >= 0:
        result["time_minutes"] = time_minutes
    if "end_days" in data or "end_time_minutes" in data:
        days=data.get("end_days",0); end_minutes=data.get("end_time_minutes",-1)
        if type(days) is not int or type(end_minutes) is not int or not 0 <= days <= 366 or not -1 <= end_minutes < 1440:
            raise CalendarError("Nieprawidłowy koniec wydarzenia (maksymalnie 366 dni różnicy dat).")
        from datetime import timedelta
        if (date(year,month,day)+timedelta(days=days)).year > 2099:
            raise CalendarError("Koniec musi mieścić się w latach 2000–2099.")
        if time_minutes < 0:
            valid=end_minutes==-1
        else:
            valid=(end_minutes>=0 and days*1440+end_minutes>time_minutes) or (end_minutes==-1 and days==0)
        if not valid:
            raise CalendarError("Koniec musi być późniejszy od początku; podaj obie godziny albo cały dzień.")
        result.update(end_days=days,end_time_minutes=end_minutes)
    return result


class CalendarRuntime:
    def __init__(self, hass, entry):
        self.hass = hass
        self.entry = entry
        self.base = f"ecalendar/ecalendar_{entry.data['mac']}"
        self.state = None
        self.device_info = {}
        self.available = None
        self.received_at = None
        self.last_contact = None
        self.last_contact_at = None
        self.last_valid_measurements = {}
        self.lock = asyncio.Lock()
        self.pending = {}
        self.waiters = set()
        self.unsubs = []
        self.measurements = {key: {"value": None, "received_at": None} for key in
                             ("temperature", "humidity", "pressure", "pressure_sealevel")}
        self.sea_available = None
        self.listeners = set()

    def subscribe(self, listener):
        self.listeners.add(listener)
        return lambda: self.listeners.discard(listener)

    @callback
    def notify(self):
        for listener in tuple(self.listeners):
            listener()

    async def start(self):
        self.unsubs.append(await mqtt.async_subscribe(self.hass, self.base + "/events/state", self.on_state, qos=0))
        self.unsubs.append(await mqtt.async_subscribe(self.hass, self.base + "/events/result", self.on_result, qos=0))
        self.unsubs.append(await mqtt.async_subscribe(self.hass, self.base + "/availability", self.on_availability, qos=0))
        for key in self.measurements:
            self.unsubs.append(await mqtt.async_subscribe(self.hass, self.base + "/" + key, self.on_measurement, qos=0))
        self.unsubs.append(await mqtt.async_subscribe(self.hass, self.base + "/pressure_sealevel/availability", self.on_sea_availability, qos=0))
        self.unsubs.append(await mqtt.async_subscribe(self.hass, self.base + "/device/state", self.on_device, qos=0))
        await self.publish("get", {})

    @callback
    def on_device(self,message):
        try:
            info=json.loads(message.payload)
            if not isinstance(info,dict):return
            clean={}
            fw=info.get("firmware")
            if isinstance(fw,str) and 0<len(fw)<=40:clean["firmware"]=fw
            import ipaddress
            try:clean["ip"]=str(ipaddress.IPv4Address(info.get("ip","")))
            except (ValueError,TypeError):pass
            if clean:
                self.device_info.update(clean)
                if not getattr(message,"retain",False):self.contact()
                self.notify()
        except (ValueError,TypeError):return

    def close(self):
        for unsub in self.unsubs:
            unsub()
        self.unsubs.clear()
        for future in [*self.pending.values(), *self.waiters]:
            if not future.done():
                future.cancel()
        self.pending.clear()
        self.waiters.clear()

    def contact(self):
        self.last_contact = datetime.now(timezone.utc).isoformat()
        self.last_contact_at = self.hass.loop.time()

    @property
    def measurements_available(self):
        keys = ("temperature", "humidity", "pressure")
        if not self.last_valid_measurements:
            return None
        now = self.hass.loop.time()
        return all(key in self.last_valid_measurements and
                   now - self.last_valid_measurements[key] < MEASUREMENT_TIMEOUT for key in keys)

    @callback
    def on_availability(self, message):
        self.available = message.payload == "online"
        self.notify()

    @callback
    def on_sea_availability(self, message):
        self.sea_available = message.payload == "online"

    @callback
    def on_measurement(self, message):
        key = message.topic.removeprefix(self.base + "/")
        if key not in self.measurements or getattr(message, "retain", False):
            return
        limits = {"temperature": (-40, 85), "humidity": (0, 100),
                  "pressure": (100, 1500), "pressure_sealevel": (100, 1500)}
        try:
            value = float(message.payload)
            low, high = limits[key]
            if not math.isfinite(value) or not low <= value <= high:
                value = None
        except (ValueError, TypeError, OverflowError):
            value = None
        self.measurements[key] = {"value": value, "received_at": self.hass.loop.time()}
        if value is not None:
            self.last_valid_measurements[key] = self.hass.loop.time()
            self.contact()
        self.notify()

    def measurement_snapshot(self):
        now = self.hass.loop.time()
        result = {}
        for key, reading in self.measurements.items():
            age = max(0, int(now - reading["received_at"])) if reading["received_at"] is not None else None
            if self.available is False or (key == "pressure_sealevel" and self.sea_available is False):
                status = "offline"
            elif age is None:
                status = "waiting"
            elif now - reading["received_at"] >= 180:
                status = "stale"
            elif reading["value"] is None:
                status = "invalid"
            else:
                status = "ok"
            result[key] = {"value": reading["value"] if status == "ok" else None,
                           "age_seconds": age, "status": status}
        return result

    @callback
    def on_state(self, message):
        try:
            data = json.loads(message.payload)
            if not isinstance(data, dict) or data.get("schema") != 1:
                return
            events, revision = data.get("events"), data.get("revision", "")
            if not isinstance(events, list) or len(events) > 50 or data.get("count") != len(events):
                return
            if not isinstance(revision, str) or not re.fullmatch(r"[0-9a-f]{64}", revision):
                return
            if any(not isinstance(event, dict) or type(event.get("index")) is not int or event["index"] != i for i, event in enumerate(events)):
                return
            for event in events:
                flag=event.get("short_month_last_day",False)
                if type(flag) is not bool or (flag and event.get("repeat") not in (2,3)):return
                days=event.get("end_days",0);minutes=event.get("end_time_minutes",-1)
                if type(days) is not int or not 0<=days<=366 or type(minutes) is not int or not -1<=minutes<1440:return
            if isinstance(data.get("device"),dict):
                self.on_device(type("Info",(),{"payload":json.dumps(data["device"]),"retain":getattr(message,"retain",False)})())
            self.state = data
            self.received_at = self.hass.loop.time()
            if not getattr(message, "retain", False):
                self.contact()
            self.notify()
            # Retained snapshots are useful for viewing but cannot certify a fresh command.
            if not getattr(message, "retain", False):
                for future in tuple(self.waiters):
                    if not future.done():
                        future.set_result(copy.deepcopy(data))
        except (ValueError, TypeError):
            return

    @callback
    def on_result(self, message):
        try:
            data = json.loads(message.payload)
            if not isinstance(data, dict):
                return
            request_id = data.get("request_id")
            if not isinstance(request_id, str):
                return
            future = self.pending.get(request_id)
            if future is not None and not future.done():
                future.set_result(data)
        except (ValueError, TypeError):
            return

    def snapshot(self):
        return {"entry_id": self.entry.entry_id, "title": self.entry.title,
                "mac": self.entry.data["mac"], "available": self.available,
                "busy": self.lock.locked(), "state": copy.deepcopy(self.state),
                "measurements": self.measurement_snapshot(),
                "device_info":dict(self.device_info), "integration_version": VERSION, "last_contact": self.last_contact,
                "contact_age_seconds": int(self.hass.loop.time()-self.last_contact_at) if self.last_contact_at is not None else None,
                "measurements_available": self.measurements_available,
                "measurement_timeout_seconds": MEASUREMENT_TIMEOUT,
                "events_age_seconds": int(self.hass.loop.time()-self.received_at) if self.received_at is not None else None}

    async def publish(self, action, payload):
        await mqtt.async_publish(self.hass, self.base + "/events/" + action,
                                 json.dumps(payload, ensure_ascii=False), qos=0, retain=False)

    async def fresh(self):
        future = self.hass.loop.create_future()
        self.waiters.add(future)
        try:
            await self.publish("get", {})
            return await asyncio.wait_for(future, TIMEOUT)
        except asyncio.TimeoutError as exc:
            raise CalendarError("Kalendarz nie przesłał aktualnej listy. Sprawdź połączenie; jeśli ekran się odświeża, spróbuj za chwilę.") from exc
        finally:
            self.waiters.discard(future)
            if not future.done():
                future.cancel()

    async def refresh(self):
        async with self.lock:
            await self.fresh()
        return {"status": "refreshed"}

    async def command(self, action, data):
        if action in ("add","update"):
            payload = validate_add(data)
            if action=="update":
                index,revision=data.get("index"),data.get("revision")
                if type(index) is not int or index<0 or not isinstance(revision,str) or not re.fullmatch(r"[0-9a-f]{64}",revision):raise CalendarError("Nieprawidłowa pozycja lub rewizja edycji.")
                payload.update(index=index,revision=revision)
        elif action == "delete":
            index, revision = data.get("index"), data.get("revision")
            if type(index) is not int or index < 0 or not isinstance(revision, str) or not re.fullmatch(r"[0-9a-f]{64}", revision):
                raise CalendarError("Nieprawidłowa pozycja na liście.")
            payload = {"index": index, "revision": revision}
        else:
            raise CalendarError("Nieznane polecenie.")
        async with self.lock:
            current = await self.fresh()
            if action in ("add","update") and payload.get("time_minutes", -1) >= 0 and current.get("supports_time") is not True:
                raise CalendarError("Zaktualizuj oprogramowanie kalendarza, aby zapisywać wydarzenia z godziną.")
            if action in ("add","update") and ("end_days" in payload or "end_time_minutes" in payload) and current.get("supports_duration") is not True:
                raise CalendarError("Najpierw zaktualizuj oprogramowanie e-Calendar do wersji obsługującej początek i koniec wydarzeń.")
            if action in ("add", "update") and payload.get("short_month_last_day") and current.get("supports_short_month") is not True:
                raise CalendarError("Najpierw zaktualizuj firmware e-Calendar do wersji obsługującej krótsze miesiące.")
            if action=="update" and current.get("supports_update") is not True:
                raise CalendarError("Zaktualizuj firmware e-Calendar, aby edytować wydarzenia.")
            if action in ("delete","update") and (current["revision"] != payload["revision"] or payload["index"] >= current["count"]):
                return {"status": "conflict", "message": "Lista zmieniła się. Sprawdź ją i ponownie otwórz wydarzenie."}
            request_id = uuid.uuid4().hex
            payload["request_id"] = request_id
            future = self.hass.loop.create_future()
            self.pending[request_id] = future
            try:
                await self.publish(action, payload)
                result = await asyncio.wait_for(future, TIMEOUT)
                return result
            except asyncio.TimeoutError as exc:
                # Never retry a mutation automatically: it may already have completed.
                raise CalendarError("Brak potwierdzenia z kalendarza. Odśwież listę przed ponowną próbą — polecenie mogło zostać wykonane.") from exc
            finally:
                self.pending.pop(request_id, None)
                if not future.done():
                    future.cancel()
