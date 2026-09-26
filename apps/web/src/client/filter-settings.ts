import { useSetFilterSettingOn } from "@/client/mutations";
import { useDraft } from "@/client/use-draft";
import type { FilterSetting } from "@/server/fns/bow";
import type { FilterDetail, FilterSettings } from "@/server/serializers";
import { withinBounds, type BoundedDuration } from "@/shared/duration-bounds";

// the system-wide Settings sections, shown once and written to every body

// one body with a filter, the first one supplying a system-wide section's values
export type FilterBody = {
  bowId: number;
  bodyName: string;
  filter: FilterDetail;
};

// whether a bounded duration has been edited to a refused value
export const anyDurationInvalid = <T extends Record<string, boolean | number>>(
  draft: T,
  current: T,
  settings: (BoundedDuration & keyof T)[],
): boolean =>
  settings.some((s) => {
    const value = draft[s];
    return (
      typeof value === "number" &&
      value !== current[s] &&
      !withinBounds(s, value)
    );
  });

// the fields where a later body's stored copy disagrees with the first body's
const diffFields = <F extends keyof FilterSettings>(
  bodies: FilterBody[],
  fields: F[],
): { body: FilterBody; fields: F[] }[] => {
  const pool = bodies[0]!.filter.settings;
  return bodies.slice(1).map((body) => ({
    body,
    fields: fields.filter((f) => pool[f] !== body.filter.settings[f]),
  }));
};

// a system-wide section's draft, its pending fields, and an Apply that writes them to every body
export const useSystemWideSettings = <F extends FilterSetting>(
  bodies: FilterBody[],
  fields: F[],
  durations: (F & BoundedDuration)[],
) => {
  const mut = useSetFilterSettingOn();
  const pool = bodies[0]!;
  const current = pool.filter.settings;
  const { draft, set, reset } = useDraft(current);
  const copyDiffs = diffFields(bodies, fields);
  const diffing = copyDiffs.flatMap((d) => d.fields);
  const pendingFields = fields.filter(
    (f) => draft[f] !== current[f] || diffing.includes(f),
  );
  const durationInvalid = anyDurationInvalid(draft, current, durations);

  const apply = async (
    // a section's own value for a field on write
    valueFor: (field: F) => boolean | number = (f) => draft[f],
    // the section's further writes before the drafts reset
    then?: () => Promise<void>,
  ) => {
    try {
      for (const field of pendingFields) {
        const value = valueFor(field);
        for (const body of bodies) {
          await mut.mutateAsync({
            bowId: body.bowId,
            filterId: body.filter.id,
            setting: field,
            value,
          });
        }
      }
      await then?.();
      reset();
    } catch {
      // the error is already shown and the drafts stay editable
    }
  };

  return {
    mut,
    pool,
    current,
    draft,
    set,
    copyDiffs,
    pendingFields,
    durationInvalid,
    apply,
  };
};
