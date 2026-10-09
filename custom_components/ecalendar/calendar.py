"""Read-only native calendar; advanced edits remain in the e-Calendar panel."""
from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.util import dt as dt_util
from .const import DOMAIN
from .entity import CalendarDeviceEntity
from .events import events_between, upcoming, event_id

async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([ECalendar(hass.data[DOMAIN]["devices"][entry.entry_id])])

class ECalendar(CalendarDeviceEntity, CalendarEntity):
    _attr_icon = "mdi:calendar"
    def __init__(self,runtime):
        super().__init__(runtime,"calendar","Kalendarz")

    @property
    def event(self):
        items=upcoming(self.events(),dt_util.now())
        return CalendarEvent(**items[0][0]) if items else None

    @property
    def extra_state_attributes(self):
        state=self.runtime.state or {}
        return {"events_revision":state.get("revision"),
                "stored_events":[{"event_id":event_id(e),
                                  "name":e.get("name")} for e in self.events()]}

    async def async_get_events(self,hass,start_date,end_date):
        return [CalendarEvent(**item) for item in events_between(self.events(),start_date,end_date)]

    def changed(self):
        super().changed()
        # Available in recent HA; older versions still refresh their calendar normally.
        notify=getattr(self,"async_update_event_listeners",None)
        if notify:
            notify()
