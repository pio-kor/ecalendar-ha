"""Fetch event list without unnecessarily refreshing the physical display."""
from homeassistant.components.button import ButtonEntity
from homeassistant.exceptions import HomeAssistantError
from .const import DOMAIN
from .entity import CalendarDeviceEntity
from .runtime import CalendarError

async def async_setup_entry(hass,entry,async_add_entities):
    async_add_entities([RefreshEvents(hass.data[DOMAIN]["devices"][entry.entry_id])])

class RefreshEvents(CalendarDeviceEntity,ButtonEntity):
    _attr_icon="mdi:calendar-sync"
    def __init__(self,runtime):super().__init__(runtime,"refresh_events","Pobierz wydarzenia")
    @property
    def available(self):return not self.runtime.lock.locked()
    async def async_press(self):
        try:await self.runtime.refresh()
        except CalendarError as exc:raise HomeAssistantError(str(exc)) from exc
