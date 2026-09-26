import {
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

import { inputNumber } from "@/client/number-input";
import type { Connection } from "@/client/settings";
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

  const portValue = inputNumber(port);
  const hostOk = isValidHost(host);
  const portOk =
    Number.isInteger(portValue) && portValue >= 1 && portValue <= 65535;
  const valid = hostOk && portOk;
  const changed = host.trim() !== initial.host || portValue !== initial.port;
  // one message line: the IP's problem first
  const message =
    host.length > 0 && !hostOk
      ? "Enter an IP address or a hostname"
      : portOk
        ? undefined
        : "Port is a whole number between 1 and 65535";

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await onTest({ host: host.trim(), port: portValue });
      notifications.show({
        color: res.ok ? "green" : "red",
        title: res.ok ? "Connection successful" : "Connection failed",
        message: res.message ?? "",
      });
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
            <Button type="submit" disabled={!valid || !changed}>
              Save
            </Button>
          </Group>
        </Group>
        <Text
          size="xs"
          c="red"
          mt={-8}
          mih={18}
          role={message === undefined ? undefined : "alert"}
          aria-live="polite">
          {message ?? "\u00a0"}
        </Text>
      </Stack>
    </form>
  );
};
