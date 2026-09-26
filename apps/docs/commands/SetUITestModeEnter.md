---
opcode: 361
area: system
status: unverified
summary: Puts the controller into test mode.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUITestModeEnter

<CommandFacts />

Puts the controller into test mode.

## Parameters

None.

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUITestModeEnter");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUITestModeEnter</Name>
</Request>
```

## Response XML

None.
