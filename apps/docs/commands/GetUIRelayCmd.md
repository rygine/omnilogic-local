---
opcode: 22
area: equipment
status: verified
summary: Reads whether a relay is on.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIRelayCmd

<CommandFacts />

Reads whether a relay is on.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1022" />

`UIRelayRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `relayId` | int  |      |
| `isOn`    | int  |      |

## Example

```typescript
const reply = await omni.command("GetUIRelayCmd", {
  poolId: 1,
  equipmentId: 8,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIRelayCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">8</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UIRelayRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="RelayID" dataType="int">8</Parameter>
    <Parameter name="IsOn" dataType="int">0</Parameter>
  </Parameters>
</Response>
```
