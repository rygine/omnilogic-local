---
opcode: 161
area: chlorinator
status: unverified
summary:
  "Turns the chlorinator cell off, waits 15 seconds, and restarts it in the
  opposite polarity, which also starts a new cycle."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# CHLORRelayPolarityReverse

<CommandFacts />

Turns the chlorinator cell off, waits 15 seconds, and restarts it in the
opposite polarity, which also starts a new cycle.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("CHLORRelayPolarityReverse", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>CHLORRelayPolarityReverse</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
