---
opcode: 118
area: panel
status: verified
summary: Reads whether the panel uses metric units.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUnits

<CommandFacts />

Reads whether the panel uses metric units.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1118" />

`GetUnitsRsp`

| name         | type | unit |
| ------------ | ---- | ---- |
| `unitFormat` | bool |      |

## Example

```typescript
const reply = await omni.command("GetUnits");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUnits</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetUnitsRsp</Name>
  <Parameters>
    <Parameter name="UnitFormat" dataType="bool">0</Parameter>
  </Parameters>
</Response>
```
