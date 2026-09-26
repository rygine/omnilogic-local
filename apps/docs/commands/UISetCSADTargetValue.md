---
opcode: 253
area: csad
status: unverified
summary:
  "Sets a Sense and Dispense module's pH set point, 7.0 to 8.0 in steps of 0.1."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADTargetValue

<CommandFacts />

Sets a Sense and Dispense module's pH set point, 7.0 to 8.0 in steps of 0.1.

## Parameters

| name          | type  | notes      |
| ------------- | ----- | ---------- |
| `poolId`      | int   |            |
| `equipmentId` | int   |            |
| `targetValue` | float | 7.0 to 8.0 |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("UISetCSADTargetValue", {
  poolId: 1,
  equipmentId: 1,
  targetValue: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADTargetValue</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="targetValue" dataType="float">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
