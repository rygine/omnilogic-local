import {
  Button,
  Group,
  NumberInput,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";

import { useRefreshCoordinates, useSetCoordinates } from "@/client/mutations";
import { inputNumber } from "@/client/number-input";
import { useCoordinates } from "@/client/queries";
import { useDraft } from "@/client/use-draft";
import { LoadError } from "@/components/LoadError/LoadError";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { StoredMeta } from "@/components/StoredMeta/StoredMeta";
import type { Coordinates } from "@/server/fns/system";

// the panel's location, a draft over the stored value
export const LocationSection = () => {
  const coordinates = useCoordinates();
  const refresh = useRefreshCoordinates();
  return (
    <>
      <SectionHeader
        title="Location"
        aside={
          coordinates.data && (
            <StoredMeta
              readAt={coordinates.data.readAt}
              refreshing={refresh.isPending}
              onRefresh={() => refresh.mutate()}
            />
          )
        }
      />
      {coordinates.isPending ? (
        <LocationSkeleton />
      ) : coordinates.isError || !coordinates.data ? (
        <LoadError
          onRetry={() => void coordinates.refetch()}
          retrying={coordinates.isFetching}
        />
      ) : (
        <LocationForm current={coordinates.data.value} />
      )}
    </>
  );
};

// in range, which a cleared field (NaN) is not
const inRange = (value: number, limit: number) =>
  Number.isFinite(value) && Math.abs(value) <= limit;

const LocationForm = ({ current }: { current: Coordinates }) => {
  const mut = useSetCoordinates();
  const { draft, set, reset, dirty } = useDraft(current);
  const latitudeOk = inRange(draft.latitude, 90);
  const longitudeOk = inRange(draft.longitude, 180);
  const valid = latitudeOk && longitudeOk;

  const apply = () =>
    mut.mutate(
      { latitude: draft.latitude, longitude: draft.longitude },
      { onSuccess: () => reset() },
    );

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Where the panel is. The controller works out sunrise and sunset from
        this location, so schedules that start or end at sunrise or sunset run
        at the right times only when it is correct.
      </Text>
      {/* the message has its own fixed line under the row */}
      <Group align="flex-end" wrap="nowrap">
        <NumberInput
          label="Latitude"
          description="Degrees north; negative for south"
          value={Number.isNaN(draft.latitude) ? "" : draft.latitude}
          onChange={(v) => set("latitude", inputNumber(v))}
          error={!latitudeOk}
          clampBehavior="none"
          step={0.0001}
          decimalScale={4}
          suffix="°"
          style={{ flex: 1 }}
        />
        <NumberInput
          label="Longitude"
          description="Degrees east; negative for west"
          value={Number.isNaN(draft.longitude) ? "" : draft.longitude}
          onChange={(v) => set("longitude", inputNumber(v))}
          error={!longitudeOk}
          clampBehavior="none"
          step={0.0001}
          decimalScale={4}
          suffix="°"
          style={{ flex: 1 }}
        />
        <Button
          onClick={apply}
          loading={mut.isPending}
          disabled={!dirty || !valid}>
          Apply
        </Button>
      </Group>
      <Text
        size="xs"
        c="red"
        mt={-8}
        mih={18}
        role={valid ? undefined : "alert"}
        aria-live="polite">
        {latitudeOk
          ? longitudeOk
            ? "\u00a0"
            : "Longitude is between -180 and 180"
          : "Latitude is between -90 and 90"}
      </Text>
    </Stack>
  );
};

const LocationSkeleton = () => (
  <Group align="flex-end" wrap="nowrap">
    <div style={{ flex: 1 }}>
      <Skeleton height={12} width={60} mb={8} radius="sm" />
      <Skeleton height={36} radius="sm" />
    </div>
    <div style={{ flex: 1 }}>
      <Skeleton height={12} width={70} mb={8} radius="sm" />
      <Skeleton height={36} radius="sm" />
    </div>
    <Skeleton height={36} width={80} radius="sm" />
  </Group>
);
