---
opcode: 61
area: equipment
status: verified
summary: Reads a smart valve's state and target.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUISmartValveCmd

<CommandFacts />

Reads a smart valve's state and target.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1061" />

`UIGetSmartValveRsp`

| name          | type | unit |
| ------------- | ---- | ---- |
| `poolId`      | int  |      |
| `equipmentId` | int  |      |
| `isOn`        | byte |      |
| `target`      | byte |      |
| `data3`       | byte |      |
| `data4`       | byte |      |

## Example

```typescript
const reply = await omni.command("GetUISmartValveCmd", {
  poolId: 2,
  equipmentId: 22,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISmartValveCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">2</Parameter>
    <Parameter name="equipmentId" dataType="int">22</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetSmartValveRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">2</Parameter>
    <Parameter name="EquipmentID" dataType="int">22</Parameter>
    <Parameter name="IsOn" dataType="byte">0</Parameter>
    <Parameter name="Target" dataType="byte">0</Parameter>
    <Parameter name="Data3" dataType="byte">0</Parameter>
    <Parameter name="Data4" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
