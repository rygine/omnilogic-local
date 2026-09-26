---
opcode: 289
area: heater
status: unverified
summary: Ranks the whole body's heat sources in one shot.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIMultiHeaterPriorityCmd

<CommandFacts />

Ranks the whole body's heat sources in one shot.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `rank1`  | int  |       |
| `rank2`  | int  |       |
| `rank3`  | int  |       |
| `rank4`  | int  |       |
| `rank5`  | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUIMultiHeaterPriorityCmd", {
  poolId: 1,
  rank1: 0,
  rank2: 0,
  rank3: 0,
  rank4: 0,
  rank5: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIMultiHeaterPriorityCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="rank1" dataType="int">0</Parameter>
    <Parameter name="rank2" dataType="int">0</Parameter>
    <Parameter name="rank3" dataType="int">0</Parameter>
    <Parameter name="rank4" dataType="int">0</Parameter>
    <Parameter name="rank5" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
