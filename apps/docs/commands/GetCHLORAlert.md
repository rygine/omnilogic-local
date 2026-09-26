---
opcode: 158
area: chlorinator
status: verified
summary: Reads the salt cell's alert word.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCHLORAlert

<CommandFacts />

Reads the salt cell's alert word.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1158" />

`GetCHLORAlertRsp`

| name            | type | unit |
| --------------- | ---- | ---- |
| `poolId`        | int  |      |
| `chlorId`       | int  |      |
| `alertHighByte` | byte |      |
| `alertLowByte`  | byte |      |

## Example

```typescript
const reply = await omni.command("GetCHLORAlert", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORAlert</Name>
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
  <Name>GetCHLORAlertRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">7</Parameter>
    <Parameter name="AlertHighByte" dataType="byte">0</Parameter>
    <Parameter name="AlertLowByte" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
