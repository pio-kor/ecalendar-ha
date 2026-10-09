"""Connect to an e-Calendar through Home Assistant's existing MQTT broker."""
import re
try:
    import probatio as vol
except ImportError:
    import voluptuous as vol
from homeassistant import config_entries
from .const import DOMAIN

class ECalendarConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            raw = user_input.get("mac", "").strip()
            if re.fullmatch(r"(?:[0-9a-fA-F]{12}|(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2})", raw):
                mac = raw.replace(":", "").lower()
                await self.async_set_unique_id(mac)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title=f"e-Calendar • {mac[-6:]}", data={"mac": mac})
            errors["mac"] = "invalid_mac"
        return self.async_show_form(step_id="user", data_schema=vol.Schema({vol.Required("mac"): str}), errors=errors)
