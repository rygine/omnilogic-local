---
opcode: 330
area: equipment
status: verified
summary: Reads the time left on a piece of equipment's countdown.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetRemainingCountdownTime

<CommandFacts />

Reads the time left on a piece of equipment's countdown.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1330" />

`GetRemainingCountdownTimeRsp`

| name          | type | unit |
| ------------- | ---- | ---- |
| `poolId`      | int  |      |
| `equipmentId` | int  |      |
| `hour`        | byte |      |
| `minute`      | byte |      |
| `second`      | byte |      |

## Example

```typescript
const reply = await omni.command("GetRemainingCountdownTime", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetRemainingCountdownTime</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetRemainingCountdownTimeRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="EquipmentID" dataType="int">3</Parameter>
    <Parameter name="Hour" dataType="byte">0</Parameter>
    <Parameter name="Minute" dataType="byte">0</Parameter>
    <Parameter name="Second" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
