import { bitmaskNames, CHLORINATOR_STATUS } from "@rygine/omnilogic-local-sdk";
import { createServerFn } from "@tanstack/react-start";

import { formatTemp } from "@/shared/temperature";

import { humanize } from "../config-settings";
import { readController } from "../controller-cache";
import { requireDevice } from "../require";
import { detailFor } from "../serializers";
import { withBowId } from "./_validators";

// one reading, wide when its text takes a whole row
export type DiagEntry = { label: string; value: string; wide?: boolean };

// the filter pump's power, firmware revisions, and error state
export const getFilterDiagnostics = createServerFn({ method: "POST" })
  .validator(withBowId)
  .handler(({ data }) =>
    readController(
      data.host,
      data.port,
      async (omni) => {
        const filter = requireDevice(omni, data.bowId, "filter");
        const info = await filter.diagnostics();
        const errorStatus = info.errorStatus;
        // the current speed leads, in the controller's display format
        const detail = detailFor(omni, data.bowId)?.filters.find(
          (f) => f.id === filter.equipmentId,
        );
        const speed =
          detail === undefined || !detail.on
            ? "Off"
            : detail.rpm !== null
              ? `${detail.rpm} RPM`
              : `${detail.speed}%`;
        return [
          { label: "Speed", value: speed },
          { label: "Power", value: `${String(info.power)} W` },
          { label: "Drive rev", value: info.driveRevision },
          { label: "Display rev", value: info.displayRevision },
          {
            label: "Error",
            value:
              errorStatus === 0
                ? "No errors detected"
                : `Code ${String(errorStatus)}`,
            wide: true,
          },
        ] satisfies DiagEntry[];
      },
      "getFilterDiagnostics",
    ),
  );

// the chlorinator cell's readings, salt, and cell type
export const getChlorinatorDiagnostics = createServerFn({ method: "POST" })
  .validator(withBowId)
  .handler(({ data }) =>
    readController(
      data.host,
      data.port,
      async (omni) => {
        const chlorinator = requireDevice(omni, data.bowId, "chlorinator");
        const entries: DiagEntry[] = [];
        try {
          const m = await chlorinator.cellMeasurement();
          const tempF = m.cellTemp;
          if (typeof tempF === "number" && !Number.isNaN(tempF)) {
            entries.push({
              label: "Cell temp",
              value: formatTemp(Math.round(tempF)),
            });
          }
          const volts = m.voltage;
          const amps = m.current;
          if (typeof volts === "number" && typeof amps === "number") {
            entries.push(
              { label: "Cell voltage", value: `${volts.toFixed(2)} V` },
              { label: "Cell current", value: `${amps.toFixed(2)} A` },
            );
          }
        } catch {
          // a failed bus read leaves the lines out
        }

        const cellType = omni.config.backyard.bodiesOfWater.find(
          (b) => b.systemId === data.bowId,
        )?.chlorinator?.cellType;

        try {
          const st = await chlorinator.cellStatus();
          const alert = st.alertStatus;
          entries.push(
            { label: "Operating state", value: String(st.opState) },
            {
              label: "Cell status",
              value:
                typeof alert === "number"
                  ? bitmaskNames(alert, CHLORINATOR_STATUS)
                  : "None",
            },
          );
          // present only for a liquid/tablet feeder
          if (st.activelyDispensing !== undefined) {
            entries.push({
              label: "Dispensing",
              value: st.activelyDispensing ? "Yes" : "No",
            });
          }
        } catch {
          // a failed bus read leaves the lines out
        }

        // no salt lines while the controller is not in normal operation, or reports none
        try {
          entries.push(
            { label: "Instant salt", value: `${chlorinator.instantSalt} ppm` },
            { label: "Average salt", value: `${chlorinator.averageSalt} ppm` },
          );
        } catch {
          // the lines are left out
        }

        const cell = humanize(cellType);
        if (cell) {
          entries.push({ label: "Cell type", value: cell });
        }

        try {
          for (const [label, value] of [
            ["Cell alert", chlorinator.alert],
            ["Cell error", chlorinator.error],
          ] as const) {
            entries.push({ label, value });
          }
        } catch {
          // a reading the controller is not sending leaves the lines out
        }

        // 0 is off
        try {
          const relay = await chlorinator.relayPolarity();
          entries.push({
            label: "Relay polarity",
            value: relay !== 0 ? "On" : "Off",
          });
        } catch {
          // a failed read leaves the line out
        }

        return entries;
      },
      "getChlorinatorDiagnostics",
    ),
  );
