---
opcode: 233
area: schedules
status: verified
summary: "Replaces a schedule's window, value, and days in place."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# EditUIScheduleCmd

<CommandFacts />

Replaces a schedule's window, value, and days in place.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `scheduleId`  | int  |       |
| `data`        | int  |       |
| `event`       | int  |       |
| `startHour`   | byte |       |
| `startMinute` | byte |       |
| `endHour`     | byte |       |
| `endMinute`   | byte |       |
| `daysActive`  | byte |       |
| `enabled`     | byte |       |
| `recurring`   | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("EditUIScheduleCmd", {
  scheduleId: 1,
  data: 0,
  event: 0,
  startHour: 0,
  startMinute: 0,
  endHour: 0,
  endMinute: 0,
  daysActive: 0,
  enabled: 0,
  recurring: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>EditUIScheduleCmd</Name>
  <Parameters>
    <Parameter name="scheduleId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="event" dataType="int">0</Parameter>
    <Parameter name="startHour" dataType="byte">0</Parameter>
    <Parameter name="startMinute" dataType="byte">0</Parameter>
    <Parameter name="endHour" dataType="byte">0</Parameter>
    <Parameter name="endMinute" dataType="byte">0</Parameter>
    <Parameter name="daysActive" dataType="byte">0</Parameter>
    <Parameter name="enabled" dataType="byte">0</Parameter>
    <Parameter name="recurring" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
