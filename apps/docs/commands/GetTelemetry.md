---
opcode: 300
area: diagnostics
status: verified
summary: Fetches the controller's full telemetry.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetTelemetry

<CommandFacts />

Fetches the controller's full telemetry.

It takes no parameters and replies with the telemetry.

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetTelemetry</Name>
</Request>
```

## Response XML

A trimmed reply. A full reply has a line for every body of water and piece of
equipment.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<STATUS version="1.12">
    <Backyard systemId="0" statusVersion="12" airTemp="92" state="1" ConfigChksum="3537466" mspVersion="R0502000" />
    <BodyOfWater systemId="1" waterTemp="86" flow="1" />
    <Filter systemId="3" filterState="1" filterSpeed="58" valvePosition="1" whyFilterIsOn="14" fpOverride="0" reportedFilterSpeed="58" power="449" lastSpeed="58" />
</STATUS>
```
