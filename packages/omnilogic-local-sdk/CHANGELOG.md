# Changelog

All notable changes to this project are recorded here, and versions follow
[Semantic Versioning](https://semver.org/).

## 0.0.7

- Added `minSpeed`, `maxSpeed`, `presets`, and `speedType` to every pump
- Added `pumpSpeedType`
- Removed `lowSpeed`, `mediumSpeed`, and `highSpeed` from filters
- Changed the speed, freeze protect, heater low speed, and auto-differential
  setters to refuse invalid values

## 0.0.6

- Added `maxRpm`, `rpm`, `toRpm`, and `fromRpm` to pumps
- Changed `cellMeasurement()` to read a zero temperature as `NaN`

## 0.0.5

- Added `setSolarSetPoint` to heaters

## 0.0.4

- Removed the valve warning from `command()`
- Changed inventory presence to an `installed` boolean
- Removed `Presence` and `presenceAt`
- Removed the `ifDirty` and `ifOlderThan` options from `refresh()`
- Changed a failed write to mark the cache stale
- Changed `refresh()` to refetch after the clock steps back
- Changed theme `create` and `rename` to trim the name
- Changed the `light.networked` check to look at every light on the body
- Changed `CSAD.ph` and `Telemetry.version` to `number | string`

## 0.0.3

- Added `isRunning` to pumps

## 0.0.2

- Removed rounding to whole seconds in `cacheTTL` calculation
- Changed minimum Node.js version to 22

## 0.0.1

Initial release.
