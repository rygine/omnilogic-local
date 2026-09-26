---
opcode: 35
area: panel
status: verified
summary: >-
  Reads the clock with its auto-update flag: date, time, format, and whether the
  controller sets its own time.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetAutoTime

<CommandFacts />

Reads the clock with its auto-update flag: date, time, format, and whether the
controller sets its own time.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1035" />

`GetAutoTimeRsp`

| name             | type   | unit |
| ---------------- | ------ | ---- |
| `year`           | int    |      |
| `month`          | int    |      |
| `day`            | int    |      |
| `format`         | bool   |      |
| `hour`           | int    |      |
| `minute`         | int    |      |
| `amPm`           | string |      |
| `autoUpdateTime` | bool   |      |

## Example

```typescript
const reply = await omni.command("GetAutoTime");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetAutoTime</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetAutoTimeRsp</Name>
  <Parameters>
    <Parameter name="Year" dataType="int">2026</Parameter>
    <Parameter name="Month" dataType="int">8</Parameter>
    <Parameter name="Day" dataType="int">25</Parameter>
    <Parameter name="Format" dataType="bool">0</Parameter>
    <Parameter name="Hour" dataType="int">2</Parameter>
    <Parameter name="Minute" dataType="int">18</Parameter>
    <Parameter name="AM_PM" dataType="string">PM</Parameter>
    <Parameter name="AutoUpdateTime" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
