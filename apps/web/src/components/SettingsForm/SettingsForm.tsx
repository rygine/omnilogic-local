import {
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { inputNumber } from "@/client/number-input";
import type { Connection } from "@/client/settings";
import { UNREACHABLE } from "@/components/LoadError/LoadError";
import { isValidHost } from "@/shared/host";

export const SettingsForm = ({
  initial,
  onSave,
  onTest,
}: {
  initial: Connection;
  onSave: (s: Connection) => void;
  onTest: (s: Connection) => Promise<{
    ok: boolean;
    message?: string;
  }>;
}) => {
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState<number | string>(initial.port);
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<{
    address: string;
    ok: boolean;
    message: string;
  }>();

  const portValue = inputNumber(port);
  const hostOk = isValidHost(host);
  const portOk =
    Number.isInteger(portValue) && portValue >= 1 && portValue <= 65535;
  const valid = hostOk && portOk;
  const changed = host.trim() !== initial.host || portValue !== initial.port;
  const address = `${host.trim()}:${portValue}`;
  const tested = lastTest?.address === address ? lastTest : undefined;
  const awaitingTest = valid && changed && tested?.ok !== true;
  const invalid =
    host.length > 0 && !hostOk
      ? "Enter an IP address or a hostname"
      : portOk
        ? undefined
        : "Port is a whole number between 1 and 65535";
  // one line under the fields: an invalid entry first, then the test's result
  const line =
    invalid !== undefined
      ? { text: invalid, color: "red" }
      : tested !== undefined
        ? { text: tested.message, color: tested.ok ? "green" : "red" }
        : awaitingTest
          ? {
              text: "Test the connection before saving.",
              color: "dimmed",
            }
          : undefined;

  const handleTest = async () => {
    setTesting(true);
    setLastTest(undefined);
    try {
      const res = await onTest({ host: host.trim(), port: portValue }).catch(
        () => ({ ok: false, message: UNREACHABLE }),
      );
      setLastTest({ address, ok: res.ok, message: res.message ?? "" });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ host: host.trim(), port: portValue });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Group align="flex-end" gap="md">
          <TextInput
            label="IP"
            value={host}
            onChange={(e) => setHost(e.currentTarget.value)}
            placeholder="192.168.1.100"
            required
            // the red border only, the message has its own line
            error={host.length > 0 && !hostOk}
            style={{ flex: "1 1 200px" }}
          />
          <NumberInput
            label="Port"
            value={port}
            onChange={setPort}
            error={!portOk}
            clampBehavior="none"
            required
            w={120}
          />
          <Group gap="xs" wrap="nowrap">
            <Button
              variant="default"
              onClick={handleTest}
              loading={testing}
              disabled={!valid}>
              Test connection
            </Button>
            <Button type="submit" disabled={!valid || !changed || awaitingTest}>
              Save
            </Button>
          </Group>
        </Group>
        <Text
          size="sm"
          c={line?.color}
          mt={-8}
          mih={22}
          role={line?.color === "red" ? "alert" : undefined}
          aria-live="polite">
          {line?.text ?? "\u00a0"}
        </Text>
      </Stack>
    </form>
  );
};
