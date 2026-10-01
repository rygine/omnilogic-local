<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/logo-dark.svg">
    <img alt="" src="brand/logo.svg" height="160">
  </picture>
  <br>OmniLogicLocal
</h1>

A [TypeScript SDK](packages/omnilogic-local-sdk) for local control of Hayward
OmniLogic pool controllers. No internet or cloud login required.

## Built with the SDK

- [Command line interface](packages/omnilogic-local-cli)\
  Get the configuration and telemetry, or send any command.
- [Homebridge plugin](packages/homebridge-omnilogic-local)\
  Control your pool equipment from HomeKit.
- [Home Assistant bridge](packages/homeassistant-omnilogic-local)\
  Your pool equipment in Home Assistant.
- [Web app](apps/web)\
  A browser interface for your pool equipment and controller settings.

## Documentation

The [documentation site](apps/docs) has a command reference and covers the SDK,
CLI, Homebridge plugin, Home Assistant bridge, and how to run the web app.

## Contributing

See the [contribution guide](./CONTRIBUTING.md) to learn more about contributing
to this project.

## Disclaimer

This software is not produced, endorsed, or supported by Hayward Industries,
Inc. "Hayward" and "OmniLogic" are trademarks of their respective owners.

## Alternatives

Other open-source projects for OmniLogic controllers.

### Local

- [python-omnilogic-local](https://github.com/cryptk/python-omnilogic-local), a
  Python library\
  Heaters, pumps, ColorLogic lights, relays, chlorinators, and themes, with a
  command line. Turns schedules on and off. Monitors chemistry but does not
  control it.
- [haomnilogic-local](https://github.com/cryptk/haomnilogic-local), a Home
  Assistant integration\
  Pumps, lights, relays, heaters, chlorinators, and sensors.
- [homebridge-omnilogic](https://github.com/danwoolley/homebridge-omnilogic), a
  Homebridge plugin\
  Themes as HomeKit switches.
- [homebridge-omnilogic-controls](https://github.com/rahouse/homebridge-omnilogic-controls),
  a Homebridge plugin\
  The filter pump and its speed, and ColorLogic lights with their shows.

### Cloud

These use Hayward's cloud service and need an internet connection and an account
login.

- [Hayward Omnilogic](https://www.home-assistant.io/integrations/omnilogic/),
  built into Home Assistant\
  Temperature, salt, pH, and ORP sensors, and switches for relays and pumps. No
  ColorLogic lights or heaters.
- [haomnilogic](https://github.com/djtimca/haomnilogic), a Home Assistant
  integration\
  Sensors, relays, pumps, ColorLogic lights, heaters, the chlorinator and its
  percent, and superchlorination. No schedules or themes.
- [omnilogic-api](https://github.com/djtimca/omnilogic-api), a Python library\
  Heaters, pumps, relays, valves, spillover, chlorinator settings, and light
  shows. No schedules or themes.
- [homebridge-omnilogic-pool](https://github.com/kzaky/OmniLogic), a Homebridge
  plugin\
  The heater and its set point, the filter pump and its speed, the chlorinator,
  and ColorLogic lights on and off.
