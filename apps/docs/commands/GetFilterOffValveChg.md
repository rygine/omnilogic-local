---
opcode: 132
area: equipment
status: verified
summary: Reads whether the filter pump turns off while its valves are moving.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFilterOffValveChg

<CommandFacts />

Reads whether the filter pump turns off while its valves are moving.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1132" />

`GetFilterOffValveChgRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `enabled` | bool |      |

## Example

```typescript
const reply = await omni.command("GetFilterOffValveChg", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFilterOffValveChg</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
