---
opcode: 130
area: equipment
status: unverified
summary: Reads the filter's operation value.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFilterOperation

<CommandFacts />

Reads the filter's operation value.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1130" />

`GetFilterOperationRsp`

| name        | type | unit |
| ----------- | ---- | ---- |
| `poolId`    | int  |      |
| `operation` | int  |      |

## Example

```typescript
const reply = await omni.command("GetFilterOperation", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFilterOperation</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
