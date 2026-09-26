# @rygine/homebridge-omnilogic-local

Homebridge plugin for local control of Hayward OmniLogic pool controllers. No
internet or cloud login required.

> [!IMPORTANT]
>
> This plugin is currently in beta. It may contain bugs or change based on
> feedback.

## Features

- Filter pumps as fans with a speed slider or switches
- Heaters as thermostats or switches, with an optional turn-off timer
- Chlorinators and spillover as fans or switches
- Lights with color and brightness, in one color, or as show switches
- Auxiliary pumps, relays, and themes as switches
- Water and air temperature sensors
- A settings page that discovers your equipment

## Requirements

- Homebridge 2
- Node.js >= 22
- Network access to the OmniLogic controller on port 10444

## Installation

From the Homebridge terminal:

```bash
npm install @rygine/homebridge-omnilogic-local
```

Or search for "omnilogic" in the Homebridge UI's plugin search.

## Usage

1. Open the plugin's settings in the Homebridge UI.
2. Enter your controller's IP address or host name and press Discover.
3. Press Add accessory, choose the equipment and how it should appear in
   HomeKit, and add it.
4. Save, and restart Homebridge when prompted.

## Credits

Icons by [Phosphor Icons](https://phosphoricons.com), used under the
[MIT License](https://github.com/phosphor-icons/core/blob/main/LICENSE).

## Disclaimer

This software is not produced, endorsed, or supported by Hayward Industries,
Inc. "Hayward" and "OmniLogic" are trademarks of their respective owners.
