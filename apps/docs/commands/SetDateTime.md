---
opcode: 101
area: system
status: unusable
summary: >-
  Sets the controller's date and time in one command. The controller
  acknowledges it, but the clock does not move.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetDateTime

<CommandFacts />

Sets the controller's date and time in one command. The controller acknowledges
it, but the clock does not move.

## Parameters

| name       | type   | notes                       |
| ---------- | ------ | --------------------------- |
| `year`     | int    |                             |
| `month`    | byte   |                             |
| `day`      | byte   |                             |
| `is24Hour` | byte   |                             |
| `hour`     | byte   |                             |
| `minute`   | byte   |                             |
| `amPm`     | string | up to 9 bytes, `AM` or `PM` |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetDateTime", {
  year: 0,
  month: 0,
  day: 0,
  is24Hour: 0,
  hour: 0,
  minute: 0,
  amPm: "AM",
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetDateTime</Name>
  <Parameters>
    <Parameter name="year" dataType="int">0</Parameter>
    <Parameter name="month" dataType="byte">0</Parameter>
    <Parameter name="day" dataType="byte">0</Parameter>
    <Parameter name="is24Hour" dataType="byte">0</Parameter>
    <Parameter name="hour" dataType="byte">0</Parameter>
    <Parameter name="minute" dataType="byte">0</Parameter>
    <Parameter name="amPm" dataType="string">AM</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
