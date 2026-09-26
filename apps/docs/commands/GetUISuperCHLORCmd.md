---
opcode: 16
area: chlorinator
status: verified
summary: Reads whether the chlorinator is superchlorinating.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUISuperCHLORCmd

<CommandFacts />

Reads whether the chlorinator is superchlorinating.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1016" />

`UISuperCHLORRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `chlorId` | int  |      |
| `isOn`    | byte |      |

## Example

```typescript
const reply = await omni.command("GetUISuperCHLORCmd", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISuperCHLORCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">6</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UISuperCHLORRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">6</Parameter>
    <Parameter name="IsOn" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
