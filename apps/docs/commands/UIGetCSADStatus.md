---
opcode: 250
area: csad
status: verified
summary: "Reads a Sense and Dispense module's current pH and ORP readings."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UIGetCSADStatus

<CommandFacts />

Reads a Sense and Dispense module's current pH and ORP readings.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1250" />

`UIGetCSADStatusRsp`

| name     | type  | unit |
| -------- | ----- | ---- |
| `poolId` | int   |      |
| `csadid` | int   |      |
| `ph`     | float |      |
| `orp`    | int   |      |

## Example

```typescript
const reply = await omni.command("UIGetCSADStatus", {
  poolId: 1,
  equipmentId: 16,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetCSADStatus</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">16</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetCSADStatusRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="CSADID" dataType="int">16</Parameter>
    <Parameter name="PH" dataType="float">0.0</Parameter>
    <Parameter name="ORP" dataType="int">0</Parameter>
  </Parameters>
</Response>
```
