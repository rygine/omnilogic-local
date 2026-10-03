# Home Assistant bridge

Connect your OmniLogic controller to Home Assistant to:

- Control all of your pool equipment
- Update equipment settings
- Disable or remove controller schedules
- Import controller schedules as automations

The bridge runs as the **OmniLogicLocal** app, or on its own.

## Requirements

- Home Assistant, with the MQTT integration and a broker
- Hayward OmniLogic MSP firmware 5.2 (R0502000) or newer
- Network access to the OmniLogic controller on UDP port 10444

On older firmware, the bridge adds no devices. It logs the firmware version and,
with Home Assistant API access, shows a notification. It adds the devices after
you upgrade the controller.

## Installing

### With Home Assistant OS

1. In Home Assistant, go to **Settings → Apps → Install app**, open the
   three-dot menu, choose **Repositories**, and add
   `https://github.com/rygine/omnilogic-local`. Or use this button, which opens
   your Home Assistant with the repository filled in:

   [![Add the repository to your Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Frygine%2Fomnilogic-local)

2. If you do not have the **Mosquitto broker** app, install it and start it.
3. If you do not have the **MQTT** integration, add it under **Settings →
   Devices & services**.
4. Install **OmniLogicLocal** from **Settings → Apps → Install app**, set its
   **Controller address**, and start it.

The app finds the Mosquitto broker on its own.

### With Home Assistant Container or Core

Run the bridge on any machine that can reach both the controller and your MQTT
broker:

```bash
export OMNILOGIC_HOST=192.168.1.100
export MQTT_URL=mqtt://homeassistant.local:1883
npx @rygine/homeassistant-omnilogic-local
```

| Variable                     | Required | Description                                                                                                                                                   |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OMNILOGIC_HOST`             | yes      | The controller's IP address.                                                                                                                                  |
| `MQTT_URL`                   | yes      | The broker's URL, such as `mqtt://user:password@host:1883`.                                                                                                   |
| `POLL_INTERVAL`              | no       | The number of seconds between reads of the controller, from 5 to 86400. Default 30.                                                                           |
| `DIAGNOSTICS_INTERVAL`       | no       | The number of seconds between reads of the auto-differential, drive errors, cell readings, and relay polarity, up to 86400. 0 stops these reads. Default 600. |
| `LOG_LEVEL`                  | no       | The log level: `trace`, `debug`, `info`, `warn`, `error`, or `off`. Use `trace` for a bug report. Default `warn`.                                             |
| `STATE_DIR`                  | no       | The folder for the schedule notification's state and for saved diagnostics. Default the current folder.                                                       |
| `HA_URL` and `HA_TOKEN`      | no       | Home Assistant's URL and a long-lived access token. The schedule notification and the import button need them.                                                |
| `DISABLE_IMPORTED_SCHEDULES` | no       | `true` turns each imported schedule off on the controller. By default, the import leaves the schedule on and turns its automation off.                        |
| `SPEED_UNIT`                 | no       | The unit of a read-only speed sensor on each variable-speed pump: `rpm` adds **Speed (RPM)**, and `percent` adds none. Default `rpm`.                         |

## Overview

The bridge exposes your equipment's controls, sensors, settings, and diagnostics
as the controller reports them, under **Settings → Devices & services → MQTT**.

## Controls

| Device         | Controls                                           |
| -------------- | -------------------------------------------------- |
| Controller     | Schedules and schedule import                      |
| Pool           | Spillover speed                                    |
| Filter pump    | On and off, speed, and presets                     |
| Auxiliary pump | On and off, speed, and presets                     |
| Heater         | Thermostat                                         |
| Chlorinator    | On and off, and output                             |
| Light          | On and off, shows, brightness, and show speed      |
| Relay          | On and off, or open and close for a valve actuator |

### Schedules

Each repeating schedule on the controller gets a switch and a **Delete** button
on the controller device. The bridge ignores a schedule that runs only once or
runs a theme.

### Pumps

- A variable-speed pump has **Speed** and the **Low**, **Medium**, and **High**
  presets, each with its speed as a `speed` attribute. Its switch starts the
  pump at its last speed. If that speed is outside the pump's range, the switch
  uses the **Low** preset.
- A dual-speed pump has a **Speed** select with **Off**, **Low** (50%), and
  **High** (100%).
- A single-speed pump has only its switch, which runs it at its maximum speed.
- A pool that shares its filter pump with a spa has **Spillover speed**. It
  reads 0 while spillover is off.

Every pump speed, settings included, is a percent, as the controller takes it,
so an automation always sets a percent. With the **Speed unit** option at `rpm`,
the default, each variable-speed pump also has a read-only **Speed (RPM)**
sensor: the percent's share of the pump's maximum RPM, to the nearest 10.

### Lights

**Brightness** and **Show speed** only appear on a light in OmniDirect mode.

### Chlorinator

**Output** is only available while the chlorinator is in Timed mode.

## Sensors

| Device                       | Sensors                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Backyard                     | Air temperature and system state                                                  |
| Pool or spa                  | Water temperature and flow                                                        |
| Filter pump                  | Speed in RPM (when speed unit is RPM), power, valve position, why on, and priming |
| Auxiliary pump               | Speed in RPM (when speed unit is RPM), and why on                                 |
| Heater                       | Each heat source's state                                                          |
| Chlorinator                  | Salt, state and mode, and alerts                                                  |
| Chemistry Sense and Dispense | pH, ORP, mode, and dispensing                                                     |
| Light                        | Power state                                                                       |

## Settings

Home Assistant lists these entities under **Configuration** on the device's
page, apart from its controls.

| Device                       | Setting                                                             | Values                                                       |
| ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| Pool or spa                  | Spillover allowed                                                   | on or off                                                    |
| Filter pump                  | Minimum speed, Maximum speed, Freeze protect speed                  | 0–100%                                                       |
| Filter pump                  | Priming duration, Cooldown duration                                 | 0–3600 seconds                                               |
| Filter pump                  | Shared filter timeout, Freeze protect override interval             | 0–86400 seconds                                              |
| Filter pump                  | Freeze protect temperature                                          | 33–42 °F, in whole degrees                                   |
| Filter pump                  | Freeze protect, Flow monitor, Off during valve change               | on or off                                                    |
| Heater                       | Cooldown, Extend, Silent mode, Allow low speed                      | on or off                                                    |
| Heater                       | Low speed                                                           | within the filter pump's minimum and maximum speed           |
| Heater                       | Solar set point, only with a solar heat source                      | the heater's set point range                                 |
| Heater                       | Auto-differential                                                   | 2–10 °F, in Fahrenheit only                                  |
| Heater                       | An **enabled** switch for each heat source, such as **Gas enabled** | on or off                                                    |
| Heater                       | A **priority** for each heat source, such as **Gas priority**       | Priority 1 to Priority 5, and Solar First for a solar source |
| Chemistry Sense and Dispense | pH target                                                           | 7.0–8.0, in steps of 0.1                                     |
| Chemistry Sense and Dispense | ORP target, available in the chlorinator's ORP Auto mode            | 400–900 mV, in steps of 5                                    |

The controller refuses a **Minimum speed** above the **Maximum speed**, a
**Maximum speed** below the **Minimum speed**, and a **Freeze protect speed**
above the **Maximum speed**. A refused value leaves the setting at its old
value.

The controller moves **Solar set point** when it conflicts with the heater's
mode:

- **Heat:** a solar set point below the heater's set point rises to 1 °F above
  it.
- **Cool:** a solar set point above the heater's set point drops to 1 °F below
  it.
- **Auto:** the solar set point matches the heater's set point.

The controller does this each time either set point or the mode changes.

Home Assistant shows **Freeze protect temperature** and **Solar set point** in
its own temperature unit. If Home Assistant uses Celsius, a temperature you set
rounds to the nearest whole °F. For example, 3 °C becomes 2.8 °C.

Consult your equipment manuals for more information on these settings.

## Diagnostics

Home Assistant lists these entities under **Diagnostic** on the device's page.

| Device                       | Diagnostics                                   |
| ---------------------------- | --------------------------------------------- |
| Controller                   | Connection and **Save diagnostics**           |
| Filter pump                  | Drive errors                                  |
| Chlorinator                  | Conditions, cell readings, and relay polarity |
| Chemistry Sense and Dispense | pH calibration and alarm limits               |

Press **Save diagnostics** on the controller device to save a JSON file. The
file holds the bridge's version and settings, without the MQTT broker URL, and
the controller's raw configuration, telemetry, and system information. The app
saves it in Home Assistant's `share` folder, under `omnilogiclocal`. Outside the
app, it goes in `STATE_DIR`. With Home Assistant API access, a notification
gives the file's path.

## Importing schedules

The controller runs its own schedules, apart from Home Assistant. The **Import
controller schedules** button on the controller device turns each enabled,
repeating schedule into a Home Assistant automation. The automation uses the
equipment's own controls, such as **Speed** or **Output**, and the import skips
a schedule whose control Home Assistant does not have.

The button needs Home Assistant API access. The app sets up this access. Outside
the app, set `HA_URL` and `HA_TOKEN`. With this access, the bridge also sends a
notification that lists the enabled, repeating schedules.

Only the controller or Home Assistant runs each schedule, not both:

- By default, the import adds each automation turned off, and the controller
  keeps running the schedule. To move a schedule to Home Assistant, turn its
  automation on, then turn off the schedule's switch on the controller device.
- With **Disable imported schedules** on (`DISABLE_IMPORTED_SCHEDULES=true`
  outside the app), the import turns the schedule off on the controller and
  leaves its automation on.

An automation differs from a controller schedule in one way. If you turn on a
controller schedule during its run time, the controller starts the equipment
right away. If you turn on an automation during that time, it waits for the next
start time.
