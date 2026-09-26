---
opcode: 128
area: equipment
status: verified
summary: Reads whether spillover is enabled on the body.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetSpaSpilloverEnable

<CommandFacts />

Reads whether spillover is enabled on the body.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1128" />

`GetSpaSpilloverEnableRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `enabled` | bool |      |

## Example

```typescript
const reply = await omni.command("GetSpaSpilloverEnable", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetSpaSpilloverEnable</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetSpaSpilloverEnableRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Enabled" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
