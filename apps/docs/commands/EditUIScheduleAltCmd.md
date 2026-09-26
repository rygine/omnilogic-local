---
opcode: 234
area: schedules
status: unverified
summary: "Replaces a schedule's window, value, and days in place."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# EditUIScheduleAltCmd

<CommandFacts />

Replaces a schedule's window, value, and days in place.

## Parameters

| name               | type | notes |
| ------------------ | ---- | ----- |
| `scheduleId`       | int  |       |
| `data`             | byte |       |
| `field19`          | byte |       |
| `field1a`          | byte |       |
| `field1b`          | byte |       |
| `event`            | int  |       |
| `startTimeHours`   | byte |       |
| `startTimeMinutes` | byte |       |
| `endTimeHours`     | byte |       |
| `endTimeMinutes`   | byte |       |
| `daysActive`       | byte |       |
| `enabled`          | byte |       |
| `recurring`        | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("EditUIScheduleAltCmd", {
  scheduleId: 1,
  data: 0,
  field19: 0,
  field1a: 0,
  field1b: 0,
  event: 0,
  startTimeHours: 0,
  startTimeMinutes: 0,
  endTimeHours: 0,
  endTimeMinutes: 0,
  daysActive: 0,
  enabled: 0,
  recurring: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>EditUIScheduleAltCmd</Name>
  <Parameters>
    <Parameter name="scheduleId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="byte">0</Parameter>
    <Parameter name="field19" dataType="byte">0</Parameter>
    <Parameter name="field1a" dataType="byte">0</Parameter>
    <Parameter name="field1b" dataType="byte">0</Parameter>
    <Parameter name="event" dataType="int">0</Parameter>
    <Parameter name="startTimeHours" dataType="byte">0</Parameter>
    <Parameter name="startTimeMinutes" dataType="byte">0</Parameter>
    <Parameter name="endTimeHours" dataType="byte">0</Parameter>
    <Parameter name="endTimeMinutes" dataType="byte">0</Parameter>
    <Parameter name="daysActive" dataType="byte">0</Parameter>
    <Parameter name="enabled" dataType="byte">0</Parameter>
    <Parameter name="recurring" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
