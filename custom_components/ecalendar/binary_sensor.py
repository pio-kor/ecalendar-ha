"""MQTT connection diagnostic without license keys or credentials."""
from homeassistant.components.binary_sensor import BinarySensorEntity,BinarySensorDeviceClass
from homeassistant.helpers.entity import EntityCategory
from .entity import CalendarDeviceEntity
from .const import DOMAIN

async def async_setup_entry(hass,entry,async_add_entities):
    async_add_entities([Connection(hass.data[DOMAIN]["devices"][entry.entry_id])])

class Connection(CalendarDeviceEntity,BinarySensorEntity):
    _attr_device_class=BinarySensorDeviceClass.RUNNING
    _attr_entity_category=EntityCategory.DIAGNOSTIC
    def __init__(self,runtime):super().__init__(runtime,"connection","Dostępność pomiarów")
    @property
    def available(self):return self.runtime.measurements_available is not None
    @property
    def is_on(self):return self.runtime.measurements_available
