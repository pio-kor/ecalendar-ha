"""Local e-Calendar event panel for Home Assistant."""
from pathlib import Path
try:
    import probatio as vol
except ImportError:
    import voluptuous as vol
from homeassistant.components import frontend, mqtt, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from .const import DOMAIN
from .runtime import CalendarError, CalendarRuntime
from .services import register_services
PLATFORMS = ["calendar", "sensor", "binary_sensor", "button"]

async def async_setup(hass, config):
    store = hass.data.setdefault(DOMAIN, {"devices": {}, "static": False, "panel": False})
    if not store.get("websocket"):
        for handler in (ws_list, ws_refresh, ws_add, ws_delete, ws_update):
            websocket_api.async_register_command(hass, handler)
        store["websocket"] = True
    if not store.get("services"):
        register_services(hass)
        store["services"] = True
    return True

async def async_setup_entry(hass, entry):
    if not await mqtt.async_wait_for_mqtt_client(hass):
        raise ConfigEntryNotReady("MQTT nie jest jeszcze połączone.")
    store = hass.data[DOMAIN]
    device = CalendarRuntime(hass, entry)
    try:
        await device.start()
        if not store["static"]:
            await hass.http.async_register_static_paths([
                StaticPathConfig("/ecalendar_static", str(Path(__file__).parent / "frontend"), False)
            ])
            store["static"] = True
        if not store["panel"]:
            await panel_custom.async_register_panel(
                hass=hass, webcomponent_name="ecalendar-panel", frontend_url_path="ecalendar",
                module_url="/ecalendar_static/ecalendar-panel.js?v=0.9.6",
                sidebar_title="e-Calendar", sidebar_icon="mdi:calendar",
                embed_iframe=False, require_admin=True,
            )
            store["panel"] = True
    except Exception:
        device.close()
        raise
    store["devices"][entry.entry_id] = device
    try:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    except Exception:
        store["devices"].pop(entry.entry_id, None)
        device.close()
        raise
    return True

async def async_unload_entry(hass, entry):
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    store = hass.data[DOMAIN]
    device = store["devices"].pop(entry.entry_id, None)
    if device:
        device.close()
    if not store["devices"] and store["panel"]:
        frontend.async_remove_panel(hass, "ecalendar")
        store["panel"] = False
    return True


def device_for(hass, connection, message):
    if not connection.user.is_admin:
        connection.send_error(message["id"], "unauthorized", "Panel e-Calendar jest dostępny dla administratora HA.")
        return None
    device = hass.data[DOMAIN]["devices"].get(message.get("entry_id"))
    if device is None:
        connection.send_error(message["id"], "not_found", "Nie znaleziono kalendarza.")
    return device

@websocket_api.websocket_command({vol.Required("type"): "ecalendar/list"})
@callback
def ws_list(hass, connection, message):
    if not connection.user.is_admin:
        connection.send_error(message["id"], "unauthorized", "Wymagane uprawnienia administratora.")
        return
    registry = er.async_get(hass)
    devices = []
    for device in hass.data[DOMAIN]["devices"].values():
        snapshot = device.snapshot()
        # MQTT unique IDs are stable even when users rename their HA entities.
        entities = {}
        for key in ("temperature", "humidity", "pressure", "pressure_sealevel"):
            entity_id = registry.async_get_entity_id("sensor", "mqtt", f"ecalendar_{snapshot['mac']}_{key}")
            entry = registry.async_get(entity_id) if entity_id else None
            entities[key] = entity_id if entry and not entry.disabled_by else None
        snapshot["entities"] = entities
        devices.append(snapshot)
    connection.send_result(message["id"], {"devices": devices})

async def operation(hass, connection, message, action):
    device = device_for(hass, connection, message)
    if device is None:
        return
    try:
        result = await device.refresh() if action == "refresh" else await device.command(action, message)
        connection.send_result(message["id"], result)
    except CalendarError as exc:
        connection.send_error(message["id"], "ecalendar_error", str(exc))
    except Exception:
        # Never include transport exceptions or potentially sensitive payloads in the UI.
        connection.send_error(message["id"], "ecalendar_error", "Nie udało się skontaktować z kalendarzem. Sprawdź MQTT i odśwież listę.")

@websocket_api.websocket_command({vol.Required("type"): "ecalendar/refresh", vol.Required("entry_id"): str})
@websocket_api.async_response
async def ws_refresh(hass, connection, message):
    await operation(hass, connection, message, "refresh")

@websocket_api.websocket_command({vol.Required("type"): "ecalendar/add", vol.Required("entry_id"): str,
                                vol.Required("name"): str, vol.Required("year"): int,
                                vol.Required("month"): int, vol.Required("day"): int,
                                vol.Required("advance_days"): int,
                                vol.Optional("repeat"): int, vol.Optional("monthly_occurrence"): int,
                                vol.Optional("monthly_weekday"): int, vol.Optional("anniversary"): bool, vol.Optional("short_month_last_day"): bool,
                                vol.Optional("anniversary_base"): int, vol.Optional("time_minutes"): int,
                                vol.Optional("end_days"): int, vol.Optional("end_time_minutes"): int})
@websocket_api.async_response
async def ws_add(hass, connection, message):
    await operation(hass, connection, message, "add")

@websocket_api.websocket_command({vol.Required("type"): "ecalendar/delete", vol.Required("entry_id"): str,
                                vol.Required("index"): int, vol.Required("revision"): str})
@websocket_api.async_response
async def ws_delete(hass, connection, message):
    await operation(hass, connection, message, "delete")

@websocket_api.websocket_command({vol.Required("type"): "ecalendar/update", vol.Required("entry_id"): str,
                                vol.Required("index"): int, vol.Required("revision"): str, vol.Required("name"): str, vol.Required("year"): int,
                                vol.Required("month"): int, vol.Required("day"): int,
                                vol.Required("advance_days"): int,
                                vol.Optional("repeat"): int, vol.Optional("monthly_occurrence"): int,
                                vol.Optional("monthly_weekday"): int, vol.Optional("anniversary"): bool, vol.Optional("short_month_last_day"): bool,
                                vol.Optional("anniversary_base"): int, vol.Optional("time_minutes"): int,
                                vol.Optional("end_days"): int, vol.Optional("end_time_minutes"): int})
@websocket_api.async_response
async def ws_update(hass, connection, message):
    await operation(hass, connection, message, "update")

