---
opcode: 122
area: chlorinator
status: verified
summary: Reads whether the body's chlorinator is enabled.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCHLOREnable

<CommandFacts />

Reads whether the body's chlorinator is enabled.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1122" />

`GetCHLOREnableRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `enabled` | bool |      |

## Example

```typescript
const reply = await omni.command("GetCHLOREnable", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLOREnable</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLOREnableRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Enabled" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
