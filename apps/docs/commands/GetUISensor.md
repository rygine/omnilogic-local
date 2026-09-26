---
opcode: 28
area: system
status: unusable
summary: "Reads a sensor's value."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUISensor

<CommandFacts />

Reads a sensor's value.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

None. The controller acknowledges the command and discards it.

## Example

```typescript
await omni.command("GetUISensor", {
  poolId: 1,
  equipmentId: 16,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISensor</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">16</Parameter>
  </Parameters>
</Request>
```

## Response XML

None. The controller acknowledges the command and discards it.
