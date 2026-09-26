---
opcode: 355
area: equipment
status: verified
summary: >-
  Reads how long shared equipment runs on each body under freeze protection, in
  seconds.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetSharedFilterTimeout

<CommandFacts />

Reads how long shared equipment runs on each body under freeze protection, in
seconds.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1355" />

`GetSharedFilterTimeoutRsp`

| name          | type | unit |
| ------------- | ---- | ---- |
| `poolId`      | int  |      |
| `equipmentId` | int  |      |
| `timeout`     | int  |      |

## Example

```typescript
const reply = await omni.command("GetSharedFilterTimeout", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetSharedFilterTimeout</Name>
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
  <Name>GetSharedFilterTimeoutRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="EquipmentID" dataType="int">3</Parameter>
    <Parameter name="Timeout" dataType="int">1800</Parameter>
  </Parameters>
</Response>
```
