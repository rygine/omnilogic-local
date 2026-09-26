---
opcode: 142
area: equipment
status: verified
summary: Reads the freeze-protection temperature threshold.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFreezeProtectTemp

<CommandFacts />

Reads the freeze-protection temperature threshold.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1142" />

`GetFreezeProtectTempRsp`

| name     | type | unit |
| -------- | ---- | ---- |
| `poolId` | int  |      |
| `temp`   | int  | F    |

## Example

```typescript
const reply = await omni.command("GetFreezeProtectTemp", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFreezeProtectTemp</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetFreezeProtectTempRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Temp" dataType="int" unit="F">38</Parameter>
  </Parameters>
</Response>
```
