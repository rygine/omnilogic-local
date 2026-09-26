---
opcode: 232
area: schedules
status: verified
summary: Enables or disables a stored schedule. The schedule stays stored.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIScheduleEnableCmd

<CommandFacts />

Enables or disables a stored schedule. The schedule stays stored.

## Parameters

| name         | type | notes |
| ------------ | ---- | ----- |
| `scheduleId` | int  |       |
| `data`       | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUIScheduleEnableCmd", {
  scheduleId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIScheduleEnableCmd</Name>
  <Parameters>
    <Parameter name="scheduleId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
