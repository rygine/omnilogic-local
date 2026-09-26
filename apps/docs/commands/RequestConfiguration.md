---
opcode: 1
area: system
status: verified
summary: >-
  Fetches the controller's whole configuration: every body of water, piece of
  equipment, name, setting, schedule, favorite, and theme.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# RequestConfiguration

<CommandFacts />

Fetches the controller's whole configuration: every body of water, piece of
equipment, name, setting, schedule, favorite, and theme.

It takes no parameters and replies with the configuration.

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>RequestConfiguration</Name>
</Request>
```

## Response XML

A trimmed reply. A full reply lists every body of water, piece of equipment,
schedule, favorite, and theme.

```xml
<!--Settings for MSP-->
<MSPConfig>
  <System>
    <Msp-Vsp-Speed-Format>RPM</Msp-Vsp-Speed-Format>
    <Units>Standard</Units>
  </System>
  <Backyard>
    <System-Id>0</System-Id>
    <Name>Backyard</Name>
    <Body-of-water>
      <System-Id>1</System-Id>
      <Name>Pool</Name>
      <Type>BOW_POOL</Type>
      <Filter>
        <System-Id>3</System-Id>
        <Name>Filter Pump</Name>
        <Filter-Type>FMT_VARIABLE_SPEED_PUMP</Filter-Type>
        <Min-Pump-Speed>58</Min-Pump-Speed>
        <Max-Pump-Speed>100</Max-Pump-Speed>
      </Filter>
    </Body-of-water>
  </Backyard>
</MSPConfig>
```
