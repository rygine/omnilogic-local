import type { EquipmentSelection } from "@/client/equipment-select";
import { ChlorinatorControl } from "@/components/controls/ChlorinatorControl/ChlorinatorControl";
import { FilterControl } from "@/components/controls/FilterControl/FilterControl";
import { HeaterControl } from "@/components/controls/HeaterControl/HeaterControl";
import { LightControl } from "@/components/controls/LightControl/LightControl";
import { PumpControl } from "@/components/controls/PumpControl/PumpControl";
import { RelayControl } from "@/components/controls/RelayControl/RelayControl";
import { SpilloverControl } from "@/components/controls/SpilloverControl/SpilloverControl";
import type { BowDetail } from "@/server/serializers";

// the control for the selected device
export const EquipmentControl = ({
  bow,
  selection,
  onSuperchlorinate,
}: {
  bow: BowDetail;
  selection: EquipmentSelection;
  onSuperchlorinate?: () => void;
}) => {
  const bowId = selection.bowId;
  switch (selection.kind) {
    case "filter": {
      const d = bow.filters.find((f) => f.id === selection.id);
      return d ? <FilterControl bowId={bowId} filter={d} /> : null;
    }
    case "heater": {
      const d = bow.heaters.find((h) => h.id === selection.id);
      return d ? <HeaterControl bowId={bowId} heater={d} /> : null;
    }
    case "light": {
      const d = bow.lights.find((l) => l.id === selection.id);
      return d ? <LightControl bowId={bowId} light={d} /> : null;
    }
    case "chlorinator": {
      const d = bow.chlorinators.find((c) => c.id === selection.id);
      return d ? (
        <ChlorinatorControl
          bowId={bowId}
          chlorinator={d}
          onSuperchlorinate={onSuperchlorinate}
        />
      ) : null;
    }
    case "pump": {
      const d = bow.pumps.find((p) => p.id === selection.id);
      return d ? <PumpControl bowId={bowId} pump={d} /> : null;
    }
    case "relay": {
      const d = bow.relays.find((r) => r.id === selection.id);
      return d ? <RelayControl bowId={bowId} relay={d} /> : null;
    }
    case "spillover": {
      const filter = bow.filters[0];
      return bow.spillover && filter ? (
        <SpilloverControl
          bowId={bowId}
          filter={filter}
          spillover={bow.spillover}
        />
      ) : null;
    }
    default:
      return null;
  }
};
