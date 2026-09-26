---
opcode: 50
area: heater
status: verified
summary: Reads whether the heater's silent mode is on.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetHeaterSilentMode

<CommandFacts />

Reads whether the heater's silent mode is on.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1050" />

`GetHeaterSilentModeRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `heaterId` | int  |      |
| `enabled`  | bool |      |

## Example

```typescript
const reply = await omni.command("GetHeaterSilentMode", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterSilentMode</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">4</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterSilentModeRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">4</Parameter>
    <Parameter name="Enabled" dataType="bool">0</Parameter>
  </Parameters>
</Response>
```
