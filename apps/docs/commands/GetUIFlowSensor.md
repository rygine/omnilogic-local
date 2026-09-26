---
opcode: 27
area: equipment
status: verified
summary: Reads the body's flow sensor.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIFlowSensor

<CommandFacts />

Reads the body's flow sensor.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1027" />

`GetUIFlowSensorRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `reading` | int  |      |

## Example

```typescript
const reply = await omni.command("GetUIFlowSensor", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFlowSensor</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFlowSensorRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Reading" dataType="int">1</Parameter>
  </Parameters>
</Response>
```
