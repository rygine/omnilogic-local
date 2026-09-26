---
opcode: 205
area: diagnostics
status: unverified
summary:
  "Reads a networked ColorLogic light's firmware versions and status, a
  network-module feature Omni controllers do not offer."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetNetworkedLightStatus

<CommandFacts />

Reads a networked ColorLogic light's firmware versions and status, a
network-module feature Omni controllers do not offer.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetNetworkedLightStatus", {
  poolId: 1,
  equipmentId: 8,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetNetworkedLightStatus</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">8</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
