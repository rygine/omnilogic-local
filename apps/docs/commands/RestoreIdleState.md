---
opcode: 340
area: system
status: unverified
summary: "Returns the panel to its idle screen."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# RestoreIdleState

<CommandFacts />

Returns the panel to its idle screen.

## Parameters

None.

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("RestoreIdleState");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>RestoreIdleState</Name>
</Request>
```

## Response XML

None.
