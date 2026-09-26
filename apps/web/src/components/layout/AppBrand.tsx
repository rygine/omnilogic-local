import { Group, Text } from "@mantine/core";
import { DropIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { useAirTemp } from "@/client/queries";
import { TemperatureReading } from "@/components/Temperature/TemperatureReading";

import { useLayout } from "./LayoutContext";

// the wordmark, with the outside air temperature beside it
export const AppBrand = () => {
  const { closeNav } = useLayout();
  const airTemp = useAirTemp();
  return (
    <Group gap="sm" wrap="nowrap">
      <Link
        to="/"
        onClick={closeNav}
        style={{ textDecoration: "none", color: "inherit" }}>
        <Group gap="xs" wrap="nowrap">
          <DropIcon size={22} color="var(--mantine-color-blue-6)" />
          <Text fw={700} size="lg">
            OmniLogic
          </Text>
        </Group>
      </Link>
      {airTemp != null && <TemperatureReading value={airTemp} />}
    </Group>
  );
};
