---
opcode: 303
area: diagnostics
status: unverified
summary:
  "Removes an alarm from the alarm list, for the alarms the panel lets you
  delete by hand."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# ClearUIAlarmCmd

<CommandFacts />

Removes an alarm from the alarm list, for the alarms the panel lets you delete
by hand.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("ClearUIAlarmCmd", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>ClearUIAlarmCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
