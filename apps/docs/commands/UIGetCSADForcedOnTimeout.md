---
opcode: 246
area: csad
status: unverified
summary:
  "Reads how long forced-on mode dispenses pH reducer before it returns to auto
  sensing."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UIGetCSADForcedOnTimeout

<CommandFacts />

Reads how long forced-on mode dispenses pH reducer before it returns to auto
sensing.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("UIGetCSADForcedOnTimeout", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetCSADForcedOnTimeout</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
