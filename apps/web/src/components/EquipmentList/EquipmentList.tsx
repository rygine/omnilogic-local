import { Stack, Table, Text } from "@mantine/core";

import { equipmentRows } from "@/client/equipment-rows";
import { Empty } from "@/components/Empty/Empty";
import type { BowDetail, EquipmentRow } from "@/server/serializers";

// a flat table of every device with its state
export const EquipmentList = ({ bows }: { bows: BowDetail[] }) => {
  return <EquipmentTable rows={equipmentRows(bows)} />;
};

// a table per body of water, a nameless device showing its type
export const EquipmentTable = ({ rows }: { rows: EquipmentRow[] }) => {
  if (rows.length === 0) {
    return <Empty of="equipment" />;
  }
  const bodies = [...new Set(rows.map((r) => r.body))];
  return (
    <Stack gap="sm">
      {bodies.map((body) => (
        <Stack key={body} gap={4}>
          <Text size="sm" fw={600}>
            {body}
          </Text>
          <Table striped withTableBorder layout="fixed">
            <Table.Tbody>
              {rows
                .filter((r) => r.body === body)
                .map((r, i) => (
                  <Table.Tr key={`${r.kind}-${r.name}-${String(i)}`}>
                    <Table.Td w="60%">{r.name || r.kind}</Table.Td>
                    <Table.Td>{r.state}</Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Stack>
      ))}
    </Stack>
  );
};
