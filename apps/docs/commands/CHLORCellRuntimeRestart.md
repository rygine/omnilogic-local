---
opcode: 162
area: chlorinator
status: unverified
summary:
  "Restarts the cell maintenance timer, which asks you to do a check of the cell
  after about 500 hours of operation."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# CHLORCellRuntimeRestart

<CommandFacts />

Restarts the cell maintenance timer, which asks you to do a check of the cell
after about 500 hours of operation.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("CHLORCellRuntimeRestart", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>CHLORCellRuntimeRestart</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
