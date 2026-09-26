---
opcode: 66
area: diagnostics
status: unverified
summary: Reads a Flow Control module's diagnostics.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFlowControlDiagnostic

<CommandFacts />

Reads a Flow Control module's diagnostics.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetFlowControlDiagnostic", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFlowControlDiagnostic</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
