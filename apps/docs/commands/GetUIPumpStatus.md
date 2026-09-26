---
opcode: 312
area: diagnostics
status: unverified
summary:
  "Reads the status of a cleaner's, water feature's, or accessory's own pump."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIPumpStatus

<CommandFacts />

Reads the status of a cleaner's, water feature's, or accessory's own pump.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetUIPumpStatus", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIPumpStatus</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
