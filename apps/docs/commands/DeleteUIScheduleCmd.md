---
opcode: 231
area: schedules
status: verified
summary: Removes a schedule by its schedule id.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# DeleteUIScheduleCmd

<CommandFacts />

Removes a schedule by its schedule id.

## Parameters

| name         | type | notes |
| ------------ | ---- | ----- |
| `scheduleId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("DeleteUIScheduleCmd", {
  scheduleId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>DeleteUIScheduleCmd</Name>
  <Parameters>
    <Parameter name="scheduleId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
