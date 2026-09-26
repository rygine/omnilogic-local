---
opcode: 275
area: csad
status: unverified
summary:
  "Sets a Sense and Dispense module's pH calibration adjustment: the tested pH
  minus the displayed pH."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADCalibrationValue

<CommandFacts />

Sets a Sense and Dispense module's pH calibration adjustment: the tested pH
minus the displayed pH.

## Parameters

| name               | type  | notes                                |
| ------------------ | ----- | ------------------------------------ |
| `poolId`           | int   |                                      |
| `equipmentId`      | int   |                                      |
| `calibrationValue` | float | tested minus displayed, such as -0.2 |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("UISetCSADCalibrationValue", {
  poolId: 1,
  equipmentId: 1,
  calibrationValue: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADCalibrationValue</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="calibrationValue" dataType="float">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
