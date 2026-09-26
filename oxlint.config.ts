import { defineConfig } from "oxlint";
import type { OxlintConfig } from "oxlint";

// no useEffect anywhere
const bannedImports = [
  {
    name: "react",
    importNames: ["useEffect"],
    message: "useEffect is not allowed",
  },
];

type ImportRule = NonNullable<
  NonNullable<OxlintConfig["rules"]>["no-restricted-imports"]
>;
type Restriction = {
  group: string[];
  message: string;
  allowTypeImports?: boolean;
};

const restrictImports = (...patterns: Restriction[]): ImportRule => [
  "error",
  { paths: bannedImports, patterns },
];

// client code, kept out of server and shared code
const clientCode: Restriction = {
  group: [
    "@/client/*",
    "@/client/**",
    "@/components/*",
    "@/components/**",
    "@/routes/*",
    "@/routes/**",
  ],
  message:
    "server and shared code must not import client/UI code; it touches browser globals",
};

const serverCode: Restriction = {
  group: ["@/server/*", "@/server/**"],
  message: "shared code must not import server code",
};

// node-only modules, kept out of code that ships to the browser
const nodeOnly: Restriction = {
  group: [
    "node:*",
    "assert",
    "async_hooks",
    "buffer",
    "child_process",
    "crypto",
    "dgram",
    "dns",
    "events",
    "fs",
    "fs/promises",
    "http",
    "https",
    "net",
    "os",
    "path",
    "readline",
    "stream",
    "tls",
    "url",
    "util",
    "worker_threads",
    "zlib",
  ],
  message:
    "browser code must not import Node built-ins; move the work into a server function",
  allowTypeImports: true,
};
const sdkRuntime: Restriction = {
  group: ["@rygine/omnilogic-local-sdk", "@rygine/omnilogic-local-sdk/*"],
  message:
    "browser code must not import the SDK at run time (it needs node:dgram); read through a server function, or mirror a constant into @/shared with a test that pins it",
  allowTypeImports: true,
};
const serverInternals: Restriction = {
  group: ["@/server/*", "@/server/**", "!@/server/fns/*", "!@/server/fns/**"],
  message:
    "browser code may call server functions (@/server/fns) but must not import other server modules at run time",
  allowTypeImports: true,
};

export default defineConfig({
  plugins: [
    "eslint",
    "import",
    "node",
    "oxc",
    "promise",
    "react",
    "typescript",
    "unicorn",
    "vitest",
    "vue",
  ],
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  ignorePatterns: [
    "dist",
    "coverage",
    ".yarn",
    ".turbo",
    ".output",
    "**/generated/**",
    "**/routeTree.gen.ts",
    "**/*.gen.ts",
    ".vitepress/cache",
    ".vitepress/dist",
    "apps/docs/reference/api",
  ],
  options: {
    typeAware: true,
  },
  rules: {
    "no-restricted-imports": restrictImports(),
    "no-restricted-properties": [
      "error",
      {
        object: "React",
        property: "useEffect",
        message: "useEffect is not allowed",
      },
    ],
    curly: ["error", "all"],
    "default-case-last": "error",
    "func-style": ["error", "expression"],
    "no-control-regex": "off",
    "no-unused-vars": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "prefer-const": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
    "import/no-unassigned-import": [
      "error",
      {
        allow: [
          "**/*.css",
          "@testing-library/jest-dom/vitest",
          "dotenv/config",
        ],
      },
    ],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      },
    ],
    "react/react-in-jsx-scope": "off",
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { allowConstantExport: true }],
    "react/jsx-pascal-case": ["error", { allowLeadingUnderscore: true }],
    "typescript/array-type": ["error", { default: "array" }],
    "typescript/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never",
        arrayLiteralTypeAssertions: "never",
        objectLiteralTypeAssertions: "never",
      },
    ],
    "typescript/consistent-type-definitions": ["error", "type"],
    "typescript/consistent-type-exports": [
      "error",
      { fixMixedExportsWithInlineTypeSpecifier: true },
    ],
    "typescript/consistent-type-imports": [
      "error",
      { fixStyle: "separate-type-imports" },
    ],
    "typescript/no-explicit-any": "error",
    "typescript/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
        varsIgnorePattern: "^_",
      },
    ],
  },
  overrides: [
    {
      files: ["apps/web/src/server/**"],
      rules: { "no-restricted-imports": restrictImports(clientCode) },
    },
    {
      files: ["apps/web/src/shared/**"],
      rules: {
        "no-restricted-imports": restrictImports(
          serverCode,
          clientCode,
          nodeOnly,
          sdkRuntime,
        ),
      },
    },
    {
      files: [
        "apps/web/src/client/**",
        "apps/web/src/components/**",
        "apps/web/src/routes/**",
      ],
      rules: {
        "no-restricted-imports": restrictImports(
          nodeOnly,
          sdkRuntime,
          serverInternals,
        ),
      },
    },
    {
      // file routes export `Route` beside their components
      files: ["apps/web/src/routes/**"],
      rules: { "react/only-export-components": "off" },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
      rules: {
        // Tests run under Node (or a browser harness with Node modules
        // resolved), so the browser-safety restrictions above do not apply —
        // a test may import the SDK to pin a mirrored constant against it
        "no-restricted-imports": restrictImports(),
        "typescript/no-non-null-assertion": "off",
        "vitest/require-mock-type-parameters": "off",
        // Test stubs shape fixtures with `as unknown as T`; allow it in tests
        "typescript/consistent-type-assertions": "off",
        // Test stubs swap a method wholesale (`const good = omni.fetchTelemetry`)
        // to restore it later; that stub is never called unbound
        "typescript/unbound-method": "off",
      },
    },
    {
      files: [
        "packages/omnilogic-local-sdk/test/**",
        "apps/web/tests/**",
        "packages/homebridge-omnilogic-local/test/**",
        "packages/omnilogic-local-cli/test/**",
      ],
      // test harnesses stub the protocol with type assertions
      rules: {
        "typescript/consistent-type-assertions": "off",
      },
    },
  ],
});
