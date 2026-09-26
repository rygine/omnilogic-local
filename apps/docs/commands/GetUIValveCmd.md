---
opcode: 24
area: equipment
status: verified
summary: Reads a valve's state.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIValveCmd

<CommandFacts />

Reads a valve's state.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1024" />

`UIValveRsp`

| name         | type | unit |
| ------------ | ---- | ---- |
| `poolId`     | int  |      |
| `vaid`       | int  |      |
| `valveState` | int  |      |

## Example

```typescript
const reply = await omni.command("GetUIValveCmd", {
  poolId: 1,
  equipmentId: 8,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIValveCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">8</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UIValveRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="VAID" dataType="int">8</Parameter>
    <Parameter name="ValveState" dataType="int">0</Parameter>
  </Parameters>
</Response>
```
