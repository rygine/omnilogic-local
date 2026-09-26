---
opcode: 385
area: equipment
status: verified
summary: Reads how long a freeze-protection override lasts.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIFreezeProtectOverrideInterval

<CommandFacts />

Reads how long a freeze-protection override lasts.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1371" />

`UIFreezeProtectOverrideIntervalRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `filterId` | int  |      |
| `interval` | int  |      |

## Example

```typescript
const reply = await omni.command("GetUIFreezeProtectOverrideInterval", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFreezeProtectOverrideInterval</Name>
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
  <Name>UIFreezeProtectOverrideIntervalRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="FilterID" dataType="int">3</Parameter>
    <Parameter name="Interval" dataType="int">7200</Parameter>
  </Parameters>
</Response>
```
