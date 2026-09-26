---
opcode: 48
area: heater
status: unverified
summary: >-
  Asks a heat source for its own sensor readings. A heater that the controller
  switches through a relay cannot answer.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetHeaterSensor

<CommandFacts />

Asks a heat source for its own sensor readings. A heater that the controller
switches through a relay cannot answer.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetHeaterSensor", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterSensor</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">4</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
