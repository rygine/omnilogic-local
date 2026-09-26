---
opcode: 144
area: equipment
status: verified
summary:
  Reads whether the no-water-flow timeout is enabled for the body's filter pump.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetFlowMonitor

<CommandFacts />

Reads whether the no-water-flow timeout is enabled for the body's filter pump.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |

## Reply

<Pill label="Opcode" value="1144" />

`GetFlowMonitorRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `poolId`  | int  |      |
| `enabled` | bool |      |

## Example

```typescript
const reply = await omni.command("GetFlowMonitor", {
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetFlowMonitor</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetFlowMonitorRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="Enabled" dataType="bool">0</Parameter>
  </Parameters>
</Response>
```
