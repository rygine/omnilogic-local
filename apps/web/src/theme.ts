import { createTheme, Switch, type MantineColorsTuple } from "@mantine/core";

const navy: MantineColorsTuple = [
  "#e7eef7",
  "#c5d4ea",
  "#a1b6dc",
  "#7c98cf",
  "#577ac2",
  "#3e60a8",
  "#314c84",
  "#243960",
  "#16263d",
  "#0a1f3c",
];

export const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  colors: { navy },
  components: {
    // no thumb notch, and a pointer cursor on the track
    Switch: Switch.extend({
      defaultProps: { withThumbIndicator: false },
      styles: { track: { cursor: "pointer" } },
    }),
  },
});
