---
opcode: 270
area: chlorinator
status: verified
summary: Reads the minutes left on a superchlorination.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUISuperCHLORTimeRemaining

<CommandFacts />

Reads the minutes left on a superchlorination.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1270" />

`GetUISuperCHLORTimeRemainingRsp`

| name                      | type | unit |
| ------------------------- | ---- | ---- |
| `poolId`                  | int  |      |
| `chlorId`                 | int  |      |
| `superChlorTimeRemaining` | int  |      |

## Example

```typescript
const reply = await omni.command("GetUISuperCHLORTimeRemaining", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISuperCHLORTimeRemaining</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">6</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISuperCHLORTimeRemainingRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">6</Parameter>
    <Parameter name="SuperChlorTimeRemaining" dataType="int">0</Parameter>
  </Parameters>
</Response>
```
