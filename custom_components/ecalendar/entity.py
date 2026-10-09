"""Entities use the same MQTT snapshot as the existing event panel."""
from datetime import timedelta
from homeassistant.core import callback
from homeassistant.helpers.entity import Entity, DeviceInfo
from homeassistant.helpers.event import async_track_time_interval
from .const import DOMAIN

class CalendarDeviceEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, runtime, key, name):
        super().__init__()
        self.runtime = runtime
        self._attr_unique_id = f"ecalendar_{runtime.entry.data['mac']}_{key}"
        self._attr_name = name
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN,runtime.entry.data['mac']),
                         ("mqtt",f"ecalendar_{runtime.entry.data['mac']}")},
            name=runtime.entry.title, manufacturer="e-Calendar")

    @property
    def available(self):
        return self.runtime.state is not None

    @callback
    def changed(self):
        self.async_write_ha_state()

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        self.async_on_remove(self.runtime.subscribe(self.changed))
        self.async_on_remove(async_track_time_interval(self.hass,self.tick,timedelta(minutes=1)))

    @callback
    def tick(self, now):
        self.changed()

    def events(self):
        return (self.runtime.state or {}).get("events", [])
