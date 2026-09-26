---
opcode: 41
area: system
status: verified
summary: Reads the body's solar set point.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetSetUISolarSetPointCmd

<CommandFacts />

Reads the body's solar set point.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1041" />

`UISolarSetPointCmdRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `heaterId` | int  |      |
| `temp`     | int  | F    |

## Example

```typescript
const reply = await omni.command("GetSetUISolarSetPointCmd", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetSetUISolarSetPointCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">4</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UISolarSetPointCmdRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">4</Parameter>
    <Parameter name="Temp" dataType="int" unit="F">94</Parameter>
  </Parameters>
</Response>
```
