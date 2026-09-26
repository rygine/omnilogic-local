---
opcode: 134
area: equipment
status: verified
summary: Reads the filter pump's minimum operating speed.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFilterLowSpeed

<CommandFacts />

Reads the filter pump's minimum operating speed.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1134" />

`GetFilterLowSpeedRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `filterId` | int  |      |
| `speed`    | int  |      |

## Example

```typescript
const reply = await omni.command("GetFilterLowSpeed", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFilterLowSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
