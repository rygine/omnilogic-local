---
opcode: 353
area: system
status: verified
summary: Reads the heater cool-down run length in seconds.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCooldownDuration

<CommandFacts />

Reads the heater cool-down run length in seconds.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1353" />

`GetCooldownDurationRsp`

| name          | type | unit |
| ------------- | ---- | ---- |
| `poolId`      | int  |      |
| `equipmentId` | int  |      |
| `duration`    | int  |      |

## Example

```typescript
const reply = await omni.command("GetCooldownDuration", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCooldownDuration</Name>
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
  <Name>GetCooldownDurationRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="EquipmentID" dataType="int">3</Parameter>
    <Parameter name="Duration" dataType="int">300</Parameter>
  </Parameters>
</Response>
```
