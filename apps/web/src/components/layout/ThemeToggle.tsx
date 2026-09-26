import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

export const ThemeToggle = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const toggle = () => setColorScheme(computed === "dark" ? "light" : "dark");
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      onClick={toggle}
      aria-label="Toggle color scheme">
      {computed === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </ActionIcon>
  );
};
