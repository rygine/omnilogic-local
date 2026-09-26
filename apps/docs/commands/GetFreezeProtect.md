---
opcode: 138
area: equipment
status: verified
summary: Reads whether freeze protection is enabled on the body's filter pump.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFreezeProtect

<CommandFacts />

Reads whether freeze protection is enabled on the body's filter pump.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1138" />

`GetFreezeProtectRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `enabled` | bool |      |

## Example

```typescript
const reply = await omni.command("GetFreezeProtect", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFreezeProtect</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetFreezeProtectRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Enabled" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
