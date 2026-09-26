---
opcode: 159
area: chlorinator
status: verified
summary: Reads the salt cell's error word.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCHLORError

<CommandFacts />

Reads the salt cell's error word.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1159" />

`GetCHLORErrorRsp`

| name            | type | unit |
| --------------- | ---- | ---- |
| `poolId`        | int  |      |
| `chlorId`       | int  |      |
| `errorHighByte` | byte |      |
| `errorLowByte`  | byte |      |

## Example

```typescript
const reply = await omni.command("GetCHLORError", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORError</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">6</Parameter>
  </Parameters>
</Request>
```

## Response XML

Captured with the pump off and the cell idle.

```xml
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORErrorRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">7</Parameter>
    <Parameter name="ErrorHighByte" dataType="byte">0</Parameter>
    <Parameter name="ErrorLowByte" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
