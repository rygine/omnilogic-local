import { Button } from "@mantine/core";
import { PowerIcon } from "@phosphor-icons/react";

// labeled by the action: a green "Turn on" when off, a red "Turn off" when on
export const PowerButton = ({
  on,
  pending,
  disabled,
  onToggle,
  onLabel = "Turn on",
  offLabel = "Turn off",
}: {
  on: boolean;
  pending?: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}) => (
  <Button
    color={on ? "red" : "green"}
    variant="filled"
    loading={pending}
    disabled={disabled}
    leftSection={<PowerIcon size={18} />}
    onClick={() => onToggle(!on)}>
    {on ? offLabel : onLabel}
  </Button>
);
