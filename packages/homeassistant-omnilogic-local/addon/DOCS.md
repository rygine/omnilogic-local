# OmniLogicLocal

Connect your OmniLogic controller to Home Assistant to:

- Control all of your pool equipment
- Update equipment settings
- Disable or remove controller schedules
- Import controller schedules as automations

## Requirements

- Hayward OmniLogic MSP firmware 5.2 (R0502000) or newer
- An MQTT broker, such as the **Mosquitto broker** app
- The MQTT integration
- Network access from Home Assistant to the controller on UDP port 10444

## Setup

1. Install the **Mosquitto broker** app and the **MQTT** integration.
2. Set **Controller address** on the **Configuration** tab.
3. Start the app.

The [guide](https://rygine.github.io/omnilogic-local/guide/home-assistant)
covers the rest.
