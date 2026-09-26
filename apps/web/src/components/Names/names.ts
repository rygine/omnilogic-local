import type { BowDetail } from "@/server/serializers";
import { NAME_MAX_BYTES, utf8Bytes } from "@/shared/names";

export type Nameable = {
  id: number;
  name: string;
  // the field's label ("Body of water", "Relay")
  kind: string;
};

// the body, then its filter, lights, pumps, and relays
export const nameablesOf = (
  bow: BowDetail,
): { body: Nameable; devices: Nameable[] } => ({
  body: { id: bow.id, name: bow.name, kind: "Body of water" },
  devices: [
    ...bow.filters.map((d) => ({ id: d.id, name: d.name, kind: "Filter" })),
    ...bow.lights.map((d) => ({ id: d.id, name: d.name, kind: "Light" })),
    ...bow.pumps.map((d) => ({ id: d.id, name: d.name, kind: "Pump" })),
    ...bow.relays.map((d) => ({ id: d.id, name: d.name, kind: "Relay" })),
  ],
});

// why a drafted name cannot be sent, mirrors the server's rule
export const nameProblem = (name: string): string | undefined => {
  if (name.trim().length === 0) {
    return "A name is required";
  }
  if (utf8Bytes(name.trim()) > NAME_MAX_BYTES) {
    return `At most ${NAME_MAX_BYTES} characters`;
  }
  return undefined;
};
