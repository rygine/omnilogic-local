---
opcode: 249
area: csad
status: unverified
summary:
  "Sets a Sense and Dispense module's pH dispensing timeout, 1 to 120 minutes,
  after which dispensing stops and an alarm stays until cleared."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADAutoTimeout

<CommandFacts />

Sets a Sense and Dispense module's pH dispensing timeout, 1 to 120 minutes,
after which dispensing stops and an alarm stays until cleared.

## Parameters

| name          | type | notes            |
| ------------- | ---- | ---------------- |
| `poolId`      | int  |                  |
| `equipmentId` | int  |                  |
| `data`        | int  | 1 to 120 minutes |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("UISetCSADAutoTimeout", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADAutoTimeout</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
