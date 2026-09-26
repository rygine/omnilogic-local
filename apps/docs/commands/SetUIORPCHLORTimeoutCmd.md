---
opcode: 18
area: csad
status: unusable
summary: "Sets the ORP chlorination timeout."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIORPCHLORTimeoutCmd

<CommandFacts />

Sets the ORP chlorination timeout.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

None. The controller acknowledges the command and discards it.

## Example

```typescript
await omni.command("SetUIORPCHLORTimeoutCmd", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIORPCHLORTimeoutCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None. The controller acknowledges the command and discards it.
