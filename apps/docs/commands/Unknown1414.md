---
opcode: 1414
area: system
status: unverified
summary: "An unnamed opcode at the end of the controller's command table."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# Unknown1414

<CommandFacts />

An unnamed opcode at the end of the controller's command table.

## Parameters

None.

## Reply

None. The controller acknowledges the command and discards it.

## Example

```typescript
await omni.command("Unknown1414");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>Unknown1414</Name>
</Request>
```

## Response XML

None. The controller acknowledges the command and discards it.
