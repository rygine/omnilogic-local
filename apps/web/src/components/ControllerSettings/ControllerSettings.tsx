import { Stack, Title } from "@mantine/core";

import { Empty } from "@/components/Empty/Empty";
import { tileSizeOf } from "@/components/Tiles/tile-size";
import { Tiles } from "@/components/Tiles/Tiles";
import type { ControllerSettings as ControllerSettingsData } from "@/server/config-settings";

// read-only, the System page never edits
export const ControllerSettings = ({
  data,
}: {
  data: ControllerSettingsData;
}) => {
  if (data.groups.length === 0) {
    return <Empty of="controller settings" />;
  }
  return (
    <Stack gap="lg">
      {data.groups.map((g) => (
        <div key={g.title}>
          <Title order={5} mb="xs">
            {g.title}
          </Title>
          <Tiles
            items={g.rows.map((r) => ({
              label: r.label,
              value: r.value,
              ...tileSizeOf(r.value),
            }))}
          />
        </div>
      ))}
    </Stack>
  );
};
