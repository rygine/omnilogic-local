---
opcode: 160
area: chlorinator
status: unverified
summary:
  "Discards the chlorinator's running average salt reading and starts a new
  average from the instant reading."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# CHLORSaltCalcRestart

<CommandFacts />

Discards the chlorinator's running average salt reading and starts a new average
from the instant reading.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("CHLORSaltCalcRestart", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>CHLORSaltCalcRestart</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
