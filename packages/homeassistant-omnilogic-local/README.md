# @rygine/homeassistant-omnilogic-local

Home Assistant bridge for local control of Hayward OmniLogic pool controllers
over MQTT. No internet or cloud login required.

> [!IMPORTANT]
>
> This software is currently in beta. It may contain bugs or change based on
> feedback.

## Features

- Control all of your pool equipment
- Update equipment settings
- Disable or remove controller schedules
- Import controller schedules as automations

## Requirements

- Home Assistant, with the MQTT integration and a broker
- Node.js >= 22, only when running outside the Home Assistant app
- Network access to the OmniLogic controller on port 10444

## Installation

### With Home Assistant OS

[![Add the repository to your Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Frygine%2Fomnilogic-local)

Or add `https://github.com/rygine/omnilogic-local` as a repository in **Settings
→ Apps → Install app**. Then install **OmniLogicLocal** and set its **Controller
address**.

### With Home Assistant Container or Core

Run the bridge on any machine that can reach both the controller and your MQTT
broker:

```bash
export OMNILOGIC_HOST=192.168.1.100
export MQTT_URL=mqtt://user:password@host:1883
npx @rygine/homeassistant-omnilogic-local
```

## Usage

Each piece of equipment appears as its own device under **Settings → Devices &
services → MQTT**. Air temperature and schedules appear as sensors and controls
on the **OmniLogic** device.

Press **Import controller schedules** on the **OmniLogic** device. It turns the
controller's schedules into automations. Outside the app, this needs `HA_URL`
and `HA_TOKEN`.

## Disclaimer

This software is not produced, endorsed, or supported by Hayward Industries,
Inc. "Hayward" and "OmniLogic" are trademarks of their respective owners.
