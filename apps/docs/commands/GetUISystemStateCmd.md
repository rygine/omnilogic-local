---
opcode: 278
area: system
status: unusable
summary:
  "Asks for the controller's operating state, but the controller never replies."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUISystemStateCmd

<CommandFacts />

Asks for the controller's operating state, but the controller never replies. The
telemetry reports the same state.

## Parameters

None.

## Reply

None. The controller acknowledges the command and sends no reply.

## Example

```typescript
await omni.command("GetUISystemStateCmd");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISystemStateCmd</Name>
</Request>
```

## Response XML

None.
