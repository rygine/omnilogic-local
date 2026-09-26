---
opcode: 383
area: equipment
status: verified
summary: Reads whether a freeze-protection override is in force.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIFreezeProtectOverride

<CommandFacts />

Reads whether a freeze-protection override is in force.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1370" />

`UIFreezeProtectOverrideRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `filterId` | int  |      |
| `enabled`  | bool |      |

## Example

```typescript
const reply = await omni.command("GetUIFreezeProtectOverride", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFreezeProtectOverride</Name>
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
  <Name>UIFreezeProtectOverrideRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="FilterID" dataType="int">3</Parameter>
    <Parameter name="Enabled" dataType="bool">0</Parameter>
  </Parameters>
</Response>
```
