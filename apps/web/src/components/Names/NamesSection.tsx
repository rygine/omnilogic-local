import {
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";

import { useRenameEquipment } from "@/client/mutations";
import {
  nameablesOf,
  nameProblem,
  type Nameable,
} from "@/components/Names/names";
import type { BowDetail } from "@/server/serializers";
import { NAME_MAX_BYTES } from "@/shared/names";

// every body's and device's name as a field, with one Apply
export const NamesSection = ({ bows }: { bows: BowDetail[] }) => {
  const mut = useRenameEquipment();
  const [edited, setEdited] = useState<Record<number, string>>({});

  const groups = bows.map(nameablesOf);
  const all = groups.flatMap((g) => [g.body, ...g.devices]);
  const draftOf = (n: Nameable): string => edited[n.id] ?? n.name;
  const changed = all.filter((n) => draftOf(n).trim() !== n.name);
  const invalid = changed.some((n) => nameProblem(draftOf(n)) !== undefined);

  const apply = async () => {
    for (const n of changed) {
      try {
        await mut.mutateAsync({ equipmentId: n.id, name: draftOf(n).trim() });
        setEdited((e) => {
          const { [n.id]: _done, ...rest } = e;
          return rest;
        });
      } catch {
        // the error is already shown and the drafts stay editable
        return;
      }
    }
  };

  const field = (n: Nameable) => (
    <TextInput
      key={n.id}
      label={n.kind}
      value={draftOf(n)}
      onChange={(e) => {
        const value = e.currentTarget.value;
        setEdited((prev) => ({ ...prev, [n.id]: value }));
      }}
      error={draftOf(n) !== n.name ? nameProblem(draftOf(n)) : undefined}
      maxLength={NAME_MAX_BYTES}
    />
  );

  return (
    <Stack gap="lg" aria-label="Names">
      <Text size="sm" c="dimmed">
        What the panel and this app call each body and device. Up to{" "}
        {NAME_MAX_BYTES} characters.
      </Text>
      <SimpleGrid
        cols={{ base: 1, sm: groups.length > 1 ? 2 : 1 }}
        spacing="lg">
        {groups.map((g) => (
          <Stack key={g.body.id} gap="sm">
            <Title order={5}>{g.body.name || "Body of water"}</Title>
            {field(g.body)}
            {g.devices.map(field)}
          </Stack>
        ))}
      </SimpleGrid>
      <Group justify="flex-end">
        <Button
          onClick={() => void apply()}
          loading={mut.isPending}
          disabled={changed.length === 0 || invalid}>
          Apply
        </Button>
      </Group>
    </Stack>
  );
};
