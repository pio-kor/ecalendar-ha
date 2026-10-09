"""Event summary entities; measurement entities remain MQTT sensors."""
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import dt as dt_util
from .const import DOMAIN
from .entity import CalendarDeviceEntity
from .events import upcoming, as_datetime

async def async_setup_entry(hass,entry,async_add_entities):
    runtime=hass.data[DOMAIN]["devices"][entry.entry_id]
    async_add_entities([EventCount(runtime),NextEvent(runtime)])

class EventCount(CalendarDeviceEntity,SensorEntity):
    _attr_icon="mdi:calendar-multiple"
    def __init__(self,runtime):
        super().__init__(runtime,"event_count","Liczba wydarzeń")
    @property
    def native_value(self):
        return len(self.events()) if self.runtime.state is not None else None

class NextEvent(CalendarDeviceEntity,SensorEntity):
    _attr_icon="mdi:calendar-clock"
    def __init__(self,runtime):
        super().__init__(runtime,"next_event","Najbliższe wydarzenie")
    def next(self):
        return upcoming(self.events(),dt_util.now())
    @property
    def native_value(self):
        items=self.next()
        return items[0][0]["summary"][:255] if items else "Brak wydarzeń"
    @property
    def extra_state_attributes(self):
        items=self.next()
        if not items:return {}
        item,event=items[0]
        day=item["start"].date() if hasattr(item["start"],"hour") else item["start"]
        return {"date":day.isoformat(),"start":item["start"].isoformat(),
                "days_remaining":max(0,(day-dt_util.now().date()).days),"end":item["end"].isoformat(),
                "ongoing":as_datetime(item["start"],dt_util.now().tzinfo)<=dt_util.now(),
                "anniversary":bool(event.get("anniversary",False)),
                "anniversary_value":event.get("anniversary_base",0)+day.year-event["year"] if event.get("anniversary") and event.get("repeat")==3 else None,
                "repeat_type":{0:"none",1:"weekly",2:"monthly",3:"yearly",4:"monthly_weekday"}.get(event.get("repeat",0),"unknown"),
                "advance_days":event.get("advance_days",0),"repeat":event.get("repeat",0),
                "event_id":item["uid"],"time_minutes":event.get("time_minutes",-1),
                "same_day_events":[x[0]["summary"] for x in items if
                  (x[0]["start"].date() if hasattr(x[0]["start"],"hour") else x[0]["start"])==day]}
