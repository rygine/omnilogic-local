---
opcode: 262
area: csad
status: unverified
summary:
  "Reads whether pH Extend, which keeps the filter pump running until the pH
  reaches the set point, is enabled."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UIGetCSADExtendEnabled

<CommandFacts />

Reads whether pH Extend, which keeps the filter pump running until the pH
reaches the set point, is enabled.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("UIGetCSADExtendEnabled", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetCSADExtendEnabled</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
