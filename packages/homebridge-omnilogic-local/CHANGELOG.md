# Changelog

All notable changes to this project are recorded here, and versions follow
[Semantic Versioning](https://semver.org/).

## 0.0.4

- Captured and added logs for every error from a HomeKit set
- Updated startup check to keep accessories when the config is invalid
- Added a log line when no controller is configured

## 0.0.3

- Changed a single-speed filter pump to a Switch only, at its maximum speed
- Changed a dual-speed filter pump to snap to Low 50% and High 100%
- Changed the settings page to explain a Fan's slider with the pump's presets or
  range
- Upgraded `@rygine/omnilogic-local-sdk` to `0.0.7`

## 0.0.2

- Removed the auxiliary pump Fan accessory
- Removed the superchlorinate switch
- Changed the "Light, one color" label to "Light (one color)"
- Changed a dropped accessory to leave HomeKit once the controller answers
- Changed heater timers to survive a change of host
- Changed the settings page to flag a duplicate id
- Upgraded `@rygine/omnilogic-local-sdk` to `0.0.4`

## 0.0.1

Initial release.
