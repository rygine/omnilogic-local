---
opcode: 25
area: equipment
status: verified
summary: Reads the current water temperature for one body of water.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIPoolTempCmd

<CommandFacts />

Reads the current water temperature for one body of water.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1025" />

`UIGetPoolTempRsp`

| name     | type | unit |
| -------- | ---- | ---- |
| `poolId` | int  |      |
| `temp`   | int  | F    |

## Example

```typescript
const reply = await omni.command("GetUIPoolTempCmd", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIPoolTempCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetPoolTempRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Temp" dataType="int" unit="F">92</Parameter>
  </Parameters>
</Response>
```
