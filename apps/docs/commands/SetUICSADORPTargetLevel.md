---
opcode: 281
area: csad
status: unverified
summary:
  "Sets a Sense and Dispense module's ORP set point, 400 to 900 mV in steps of
  5."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUICSADORPTargetLevel

<CommandFacts />

Sets a Sense and Dispense module's ORP set point, 400 to 900 mV in steps of 5.

## Parameters

| name          | type | notes         |
| ------------- | ---- | ------------- |
| `poolId`      | int  |               |
| `equipmentId` | int  |               |
| `data`        | int  | 400 to 900 mV |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUICSADORPTargetLevel", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUICSADORPTargetLevel</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
