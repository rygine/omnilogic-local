---
opcode: 131
area: equipment
status: verified
summary: Sets whether the filter pump turns off while its valves are moving.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetFilterOffValveChg

<CommandFacts />

Sets whether the filter pump turns off while its valves are moving.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetFilterOffValveChg", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetFilterOffValveChg</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
