# Supported hardware

The SDK should work with any equipment that a Hayward OmniLogic controller
supports.

## Verified

The [equipment layer](/guide/equipment) is verified on hardware with this
equipment:

- Hayward OmniPL, MSP firmware R0502000
- Pool and spa that share one filter pump, heater, and chlorinator
- Hayward TriStar VS 950 Omni filter pump
- Hayward Smart Heater (gas)
- Salt chlorinator with a TCELLS340 cell
- Universal ColorLogic (UCL) lights, with or without OmniDirect (a light mode
  that adds colors, a show speed, and a brightness)
- High voltage relays
- Air temperature, water temperature, and flow sensors

## Unverified

- Salt chlorinator cells
  - T-Cell-3
  - T-Cell-5
  - T-Cell-9
  - T-Cell-15
  - T-Cell-LS
  - TCELLS315
  - TCELLS325
- AQR940/AQR925 Aqua Rite chlorine generator, with an HLAQRPCB communication
  board
- Feeders and dispensers
  - HL-CHEM4-CHLOR liquid chlorine feeder
  - CL200 chlorine tablet feeder
  - HL-CHEM4-ACID liquid acid feeder
  - AQL-CHEM2 CO2 dispenser
- HL-CHEM Sense and Dispense ORP and pH sensing kit
- Pumps
  - TriStar VS 900 Omni
  - Super Pump VS 700 Omni
  - MaxFlo VS 500 Omni
  - EcoStar
  - Single-speed and dual-speed filter pumps
  - Cleaner, water feature, and accessory pumps
- Heat pump, solar, electric, and geothermal heaters
- Chillers
- Lights
  - ColorLogic 2.5 (CL2.5)
  - ColorLogic 4.0 (CL4.0)
  - Universal ColorLogic in Pentair SAM mode
  - WaterBowl
  - Pentair Color LED (P-COLOR)
  - Jandy Color LED (Z-Color)
  - Incandescent
  - LTSUY11300 Smart Power Transformer
- Valve actuators
  - V&A-xx valve and actuator
  - Pentair/Compool and Jandy valve actuators
- Relays and expansion
  - Low voltage relays
  - HLRELAYBANK additional relay pack
  - HLRELAY single high voltage relay kit
  - HLH485RELAY Smart Relay
  - HLEXPAND Expansion Panel
  - HLIOEXPAND Input/Output Expander Board
- Sensors and inputs
  - GLX-FLO flow switch
  - 2PC temperature sensor
  - Solar sensor
  - External input interlocks

Unverified lights, relays, pumps, heaters, chlorinators, and Sense and Dispense
equipment should work through the [equipment layer](/guide/equipment). If not,
use [`command()`](/guide/commands) instead.

```typescript
import { OmniLogic, timerParams } from "@rygine/omnilogic-local-sdk";

const omni = new OmniLogic({ host: "192.168.1.100" });

// fetch config and telemetry
await omni.refresh();

// turn on a piece of equipment by its id
await omni.command("SetUIEquipmentCmd", {
  poolId: 1,
  equipmentId: 12,
  isOn: 1,
  ...timerParams(),
});
```
