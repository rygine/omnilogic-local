---
opcode: 29
area: equipment
status: unverified
summary: "Reads the solar (roof) sensor's temperature."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUISolarTempCmd

<CommandFacts />

Reads the solar (roof) sensor's temperature.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetUISolarTempCmd", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISolarTempCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">4</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
