---
opcode: 26
area: equipment
status: verified
summary: Reads the air temperature.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIAirTempCmd

<CommandFacts />

Reads the air temperature.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1026" />

`UIGetAirTempRsp`

| name   | type | unit |
| ------ | ---- | ---- |
| `temp` | int  | F    |

## Example

```typescript
const reply = await omni.command("GetUIAirTempCmd");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIAirTempCmd</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetAirTempRsp</Name>
  <Parameters>
    <Parameter name="Temp" dataType="int" unit="F">101</Parameter>
  </Parameters>
</Response>
```
