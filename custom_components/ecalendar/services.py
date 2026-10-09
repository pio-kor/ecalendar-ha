"""Actions share validation, confirmation and revision protection with the panel."""
from datetime import date, time
try:
    import probatio as vol
except ImportError:
    import voluptuous as vol
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from .const import DOMAIN
from .events import event_id
from .runtime import CalendarError


def register_services(hass):
    async def handle(call):
        user_id = getattr(getattr(call, "context", None), "user_id", None)
        if user_id:
            user = await hass.auth.async_get_user(user_id)
            if user is None or not user.is_admin:
                raise ServiceValidationError("Obsługa wydarzeń wymaga uprawnień administratora HA.")
        registry=er.async_get(hass)
        entity=registry.async_get(call.data["entity_id"])
        runtime=hass.data[DOMAIN]["devices"].get(entity.config_entry_id) if entity and entity.platform==DOMAIN and entity.domain=="calendar" else None
        if runtime is None:
            raise ServiceValidationError("Wybierz encję kalendarza e-Calendar.")
        try:
            if call.service=="refresh_events":
                await runtime.refresh()
                return
            if call.service=="delete_event":
                state=await runtime.fresh()
                matches=[e for e in state["events"] if event_id(e)==call.data["event_id"]]
                if len(matches)!=1:
                    raise CalendarError("Nie znaleziono jednoznacznego wydarzenia. Pobierz listę ponownie.")
                result=await runtime.command("delete",{"index":matches[0]["index"],"revision":state["revision"]})
            else:
                try:
                    for key in ("advance_days", "repeat", "monthly_occurrence", "monthly_weekday", "anniversary_base"):
                        value = call.data.get(key)
                        if isinstance(value, bool) or (isinstance(value, float) and not value.is_integer()):
                            raise ValueError
                    day=date.fromisoformat(call.data["date"])
                    payload={"year":day.year,"month":day.month,"day":day.day,"name":call.data["name"],
                             "advance_days":int(call.data.get("advance_days",0)),
                             "repeat":int(call.data.get("repeat",0)),
                             "monthly_occurrence":int(call.data.get("monthly_occurrence",1)),
                             "monthly_weekday":int(call.data.get("monthly_weekday",1)),
                             "anniversary":call.data.get("anniversary",False),
                             "anniversary_base":int(call.data.get("anniversary_base",0))}
                    value=call.data.get("time","")
                    if value:
                        hour=time.fromisoformat(value)
                        if hour.second or hour.microsecond or hour.tzinfo:
                            raise ValueError
                        payload["time_minutes"]=hour.hour*60+hour.minute
                    end_date=call.data.get("end_date","");end_time=call.data.get("end_time","")
                    if end_date or end_time:
                        last=date.fromisoformat(end_date) if end_date else day
                        payload["end_days"]=(last-day).days
                        payload["end_time_minutes"]=-1
                        if end_time:
                            hour=time.fromisoformat(end_time)
                            if hour.second or hour.microsecond or hour.tzinfo:raise ValueError
                            payload["end_time_minutes"]=hour.hour*60+hour.minute
                        if value and not end_time:raise ValueError
                except (ValueError,TypeError):
                    raise CalendarError("Nieprawidłowa data, godzina lub opcje powtarzania.")
                result=await runtime.command("add",payload)
            if result.get("status") not in ("saved","exists","deleted"):
                raise CalendarError(result.get("message","Kalendarz nie potwierdził operacji."))
        except CalendarError as exc:
            raise ServiceValidationError(str(exc)) from exc

    common={vol.Required("entity_id"):str}
    hass.services.async_register(DOMAIN,"refresh_events",handle,schema=vol.Schema(common))
    hass.services.async_register(DOMAIN,"delete_event",handle,schema=vol.Schema({**common,vol.Required("event_id"):str}))
    hass.services.async_register(DOMAIN,"add_event",handle,schema=vol.Schema({**common,
        vol.Required("name"):str,vol.Required("date"):str,
        vol.Optional("time"):str,vol.Optional("end_date"):str,vol.Optional("end_time"):str,vol.Optional("advance_days") :vol.Any(int,str),
        vol.Optional("repeat"):vol.Any(int,str),vol.Optional("monthly_occurrence"):vol.Any(int,str),
        vol.Optional("monthly_weekday"):vol.Any(int,str),vol.Optional("anniversary"):bool,
        vol.Optional("anniversary_base"):vol.Any(int,float)}))
