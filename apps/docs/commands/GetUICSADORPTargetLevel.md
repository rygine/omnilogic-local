---
opcode: 282
area: csad
status: unverified
summary: "Reads a Sense and Dispense module's ORP set point in mV."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUICSADORPTargetLevel

<CommandFacts />

Reads a Sense and Dispense module's ORP set point in mV.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetUICSADORPTargetLevel", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUICSADORPTargetLevel</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
