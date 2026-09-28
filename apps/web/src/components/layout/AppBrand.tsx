import { Box, Group, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { useAirTemp } from "@/client/queries";
import { TemperatureReading } from "@/components/Temperature/TemperatureReading";

import logoDark from "../../../../../brand/logo-dark.svg?url";
import logo from "../../../../../brand/logo.svg?url";
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
          <Box component="img" src={logo} alt="" w={30} h={30} darkHidden />
          <Box
            component="img"
            src={logoDark}
            alt=""
            w={30}
            h={30}
            lightHidden
          />
          <Text fw={700} size="lg">
            OmniLogic
          </Text>
        </Group>
      </Link>
      {airTemp != null && <TemperatureReading value={airTemp} />}
    </Group>
  );
};
