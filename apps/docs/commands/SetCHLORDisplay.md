---
opcode: 123
area: chlorinator
status: verified
summary: Sets whether the panel labels the chlorinator as Salt or Minerals.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetCHLORDisplay

<CommandFacts />

Sets whether the panel labels the chlorinator as Salt or Minerals.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetCHLORDisplay", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetCHLORDisplay</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
