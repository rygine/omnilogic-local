---
opcode: 379
area: system
status: verified
summary:
  "Reads the panel's display-mode byte, which arrives as a one-byte string."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIDisplayModeState

<CommandFacts />

Reads the panel's display-mode byte, which arrives as a one-byte string.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1368" />

`GetUIDisplayModeStateRsp`

| name    | type   | unit |
| ------- | ------ | ---- |
| `state` | string |      |

## Example

```typescript
const reply = await omni.command("GetUIDisplayModeState");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIDisplayModeState</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIDisplayModeStateRsp</Name>
  <Parameters>
    <Parameter name="State" dataType="string">&#x01;</Parameter>
  </Parameters>
</Response>
```
