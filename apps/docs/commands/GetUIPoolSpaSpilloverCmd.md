---
opcode: 7
area: equipment
status: verified
summary: Reads the pool and spa valve position.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIPoolSpaSpilloverCmd

<CommandFacts />

Reads the pool and spa valve position.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1007" />

`UIPoolSpaSpilloverRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `position` | int  |      |

## Example

```typescript
const reply = await omni.command("GetUIPoolSpaSpilloverCmd", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIPoolSpaSpilloverCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UIPoolSpaSpilloverRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Position" dataType="int">1</Parameter>
  </Parameters>
</Response>
```
