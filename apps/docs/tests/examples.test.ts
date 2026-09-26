import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

// every typescript block on every guide and command page compiles against the SDK
const DIRS = ["guide", "commands"].map((d) =>
  join(import.meta.dirname, "..", d),
);
const VIRTUAL = join(import.meta.dirname, "examples.virtual.ts");

const PREAMBLE = `declare const omni: import("@rygine/omnilogic-local-sdk").OmniLogic;
declare const config: import("@rygine/omnilogic-local-sdk").MSPConfig;
declare const telemetry: import("@rygine/omnilogic-local-sdk").Telemetry;
`;

const blocks = (page: string): string[] =>
  [...page.matchAll(/```typescript\n([\s\S]*?)```/g)].map((m) => m[1]!);

// imports hoist to the top, the rest runs inside its own async function
const assemble = (): { source: string; count: number } => {
  const names = new Set<string>();
  const bodies: string[] = [];
  for (const dir of DIRS) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
      for (const block of blocks(readFileSync(join(dir, f), "utf8"))) {
        const body = block
          .replace(
            /^import (?:type )?\{([^}]*)\} from "@rygine\/omnilogic-local-sdk";\n?/gm,
            (_, list: string) => {
              for (const n of list.split(",")) {
                names.add(n.trim().replace(/^type /, ""));
              }
              return "";
            },
          )
          .split("\n");
        bodies.push(`// ${f}\nasync () => {\n${body.join("\n")}\n};`);
      }
    }
  }
  const imports =
    names.size === 0
      ? ""
      : `import { ${[...names].filter(Boolean).join(", ")} } from "@rygine/omnilogic-local-sdk";\n`;
  return {
    source: `${PREAMBLE}${imports}${bodies.join("\n\n")}\n`,
    count: bodies.length,
  };
};

describe("page examples", () => {
  // one full type-check of every example, slow on a shared ci runner
  it("compile against the SDK", { timeout: 60_000 }, () => {
    const { source, count } = assemble();
    expect(count).toBeGreaterThan(0);
    const options: ts.CompilerOptions = {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
      strict: true,
      noEmit: true,
      noUnusedLocals: false,
      skipLibCheck: true,
    };
    const host = ts.createCompilerHost(options);
    const readFile = host.readFile.bind(host);
    const fileExists = host.fileExists.bind(host);
    host.readFile = (f) => (f === VIRTUAL ? source : readFile(f));
    host.fileExists = (f) => f === VIRTUAL || fileExists(f);
    const program = ts.createProgram([VIRTUAL], options, host);
    const errors = ts.getPreEmitDiagnostics(program).map((d) => {
      const where =
        d.file && d.start !== undefined
          ? d.file.getLineAndCharacterOfPosition(d.start)
          : undefined;
      const line = where ? `:${where.line + 1}` : "";
      return `${line} ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
    });
    expect(errors).toEqual([]);
  });
});
