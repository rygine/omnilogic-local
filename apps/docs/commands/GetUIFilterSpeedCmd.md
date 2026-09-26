---
opcode: 10
area: equipment
status: verified
summary: Reads the filter pump's speed.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIFilterSpeedCmd

<CommandFacts />

Reads the filter pump's speed.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1010" />

`UIFilterSpeedRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `filterId` | int  |      |
| `speed`    | int  | RPM  |

## Example

```typescript
const reply = await omni.command("GetUIFilterSpeedCmd", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFilterSpeedCmd</Name>
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
  <Name>UIFilterSpeedRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="FilterID" dataType="int">3</Parameter>
    <Parameter name="Speed" dataType="int" unit="RPM">58</Parameter>
  </Parameters>
</Response>
```
