---
opcode: 224
area: equipment
status: unverified
summary:
  "Tests whether a Universal ColorLogic light supports OmniDirect mode. A light
  built after June 2018 answers with a white blink."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# IDV2Light

<CommandFacts />

Tests whether a Universal ColorLogic light supports OmniDirect mode. A light
built after June 2018 answers with a white blink.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("IDV2Light", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>IDV2Light</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
