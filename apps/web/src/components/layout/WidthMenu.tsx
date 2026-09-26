import { ActionIcon, Menu } from "@mantine/core";
import { CheckIcon, LayoutIcon } from "@phosphor-icons/react";

import {
  LAYOUT_WIDTH_OPTIONS,
  setLayoutWidth,
  useLayoutWidth,
} from "@/client/layout-width";

export const WidthMenu = () => {
  const width = useLayoutWidth();
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          visibleFrom="sm"
          aria-label="Content width">
          <LayoutIcon size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {LAYOUT_WIDTH_OPTIONS.map((option) => (
          <Menu.Item
            key={option.value}
            aria-current={option.value === width}
            rightSection={
              option.value === width ? <CheckIcon size={14} /> : null
            }
            onClick={() => setLayoutWidth(option.value)}>
            {option.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};
