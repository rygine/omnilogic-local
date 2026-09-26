---
opcode: 306
area: diagnostics
status: verified
summary:
  "Reads the filter pump's speed, state, why it is on, and valve position."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIFilterStatus

<CommandFacts />

Reads the filter pump's speed, state, why it is on, and valve position.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1306" />

`GetUIFilterStatusRsp`

| name            | type | unit |
| --------------- | ---- | ---- |
| `poolId`        | int  |      |
| `filterId`      | int  |      |
| `filterSpeed`   | int  |      |
| `filterState`   | int  |      |
| `whyFilterIsOn` | int  |      |
| `valvePosition` | int  |      |

## Example

```typescript
const reply = await omni.command("GetUIFilterStatus", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFilterStatus</Name>
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
  <Name>GetUIFilterStatusRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="FilterID" dataType="int">3</Parameter>
    <Parameter name="FilterSpeed" dataType="int">58</Parameter>
    <Parameter name="FilterState" dataType="int">1</Parameter>
    <Parameter name="WhyFilterIsOn" dataType="int">170</Parameter>
    <Parameter name="ValvePosition" dataType="int">1</Parameter>
  </Parameters>
</Response>
```
