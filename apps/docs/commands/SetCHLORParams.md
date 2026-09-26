---
opcode: 155
area: chlorinator
status: unverified
summary: Sets every chlorinator parameter at once.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetCHLORParams

<CommandFacts />

Sets every chlorinator parameter at once.

## Parameters

| name           | type | notes |
| -------------- | ---- | ----- |
| `poolId`       | int  |       |
| `equipmentId`  | int  |       |
| `cfgState`     | byte |       |
| `opMode`       | byte |       |
| `bowType`      | byte |       |
| `cellType`     | byte |       |
| `timedPercent` | byte |       |
| `scTimeout`    | byte |       |
| `orpTimeout`   | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetCHLORParams", {
  poolId: 1,
  equipmentId: 1,
  cfgState: 0,
  opMode: 0,
  bowType: 0,
  cellType: 0,
  timedPercent: 0,
  scTimeout: 0,
  orpTimeout: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetCHLORParams</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="cfgState" dataType="byte">0</Parameter>
    <Parameter name="opMode" dataType="byte">0</Parameter>
    <Parameter name="bowType" dataType="byte">0</Parameter>
    <Parameter name="cellType" dataType="byte">0</Parameter>
    <Parameter name="timedPercent" dataType="byte">0</Parameter>
    <Parameter name="scTimeout" dataType="byte">0</Parameter>
    <Parameter name="orpTimeout" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
