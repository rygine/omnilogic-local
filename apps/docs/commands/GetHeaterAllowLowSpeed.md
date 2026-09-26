---
opcode: 357
area: heater
status: verified
summary: Reads whether a heat source may run while the pump is at low speed.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetHeaterAllowLowSpeed

<CommandFacts />

Reads whether a heat source may run while the pump is at low speed.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1357" />

`GetHeaterAllowLowSpeedRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `heaterId` | int  |      |
| `enabled`  | bool |      |

## Example

```typescript
const reply = await omni.command("GetHeaterAllowLowSpeed", {
  poolId: 1,
  equipmentId: 5,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterAllowLowSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">5</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterAllowLowSpeedRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">5</Parameter>
    <Parameter name="Enabled" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
