import type { Theme } from "vitepress";
import DefaultTheme, { VPImage } from "vitepress/theme";
import { h } from "vue";

import CommandFacts from "./CommandFacts.vue";
import CommandTable from "./CommandTable.vue";
import Pill from "./Pill.vue";
import StatusPill from "./StatusPill.vue";

import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "home-hero-info-before": () =>
        h(
          "div",
          { class: "home-logo" },
          h(VPImage, {
            image: { light: "/logo.svg", dark: "/logo-dark.svg" },
            alt: "",
          }),
        ),
      "home-hero-info-after": () =>
        h("p", { class: "home-note" }, "No internet or cloud login required."),
      "home-features-before": () =>
        h("p", { class: "home-intro" }, "Built with the SDK"),
    }),
  enhanceApp({ app }) {
    app.component("CommandFacts", CommandFacts);
    app.component("CommandTable", CommandTable);
    app.component("Pill", Pill);
    app.component("StatusPill", StatusPill);
  },
} satisfies Theme;
