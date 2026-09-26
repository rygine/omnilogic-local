---
opcode: 140
area: equipment
status: verified
summary: Reads the speed the filter pump runs at under freeze protection.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFreezeProtectSpeed

<CommandFacts />

Reads the speed the filter pump runs at under freeze protection.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1140" />

`GetFreezeProtectSpeedRsp`

| name     | type | unit |
| -------- | ---- | ---- |
| `poolId` | int  |      |
| `speed`  | int  | RPM  |

## Example

```typescript
const reply = await omni.command("GetFreezeProtectSpeed", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFreezeProtectSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetFreezeProtectSpeedRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Speed" dataType="int" unit="RPM">80</Parameter>
  </Parameters>
</Response>
```
