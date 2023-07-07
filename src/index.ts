import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadFile,
  template,
  PresetAsset,
  PresetContext,
  resolveDirective,
} from "presetter";
import { readPackage } from "read-pkg";

const DIR = fileURLToPath(dirname(import.meta.url));

// paths to the template directory
const TEMPLATES = resolve(DIR, "..", "templates");

/** List of configurable variables */
export type Variable = {
  /** the directory containing all source code (default: source) */
  source: string;
  /** the directory containing all the compiled files (default: lib) */
  output: string;
  buildSource: string;
};

export const DEFAULT_VARIABLE: Variable = {
  source: "build",
  output: "lib",
  buildSource: "src",
};

function buildOptions(context: PresetContext) {
  const opts = context.custom.config?.esbuild as any;
  if (!opts) {
    throw new Error("esbuild options missing!");
  }

  return { esbuildOptions: resolveDirective(opts, context).stringifiedConfig };
}

/**
 * get the list of templates provided by this preset
 * @returns list of preset templates
 */
export default async function (context: PresetContext): Promise<PresetAsset> {
  let name: string = context.custom.config?.pluginName as unknown as string;

  if (!name) {
    const pkg = await readPackage();
    name = pkg.name.split("plugin-").pop() as string;
  }

  return {
    extends: ["@lumeweb/node-library-preset"],
    template: {
      "build.js": (context) => {
        const content = loadFile(resolve(TEMPLATES, "build.js"), "text");
        const variable = buildOptions(context);

        return template(content, variable);
      },
    },
    scripts: resolve(TEMPLATES, "scripts.yaml"),
    noSymlinks: ["build.js"],
    supplementaryConfig: {
      "gitignore": ["build.js"],
      "tsconfig": {
        compilerOptions: {
          moduleResolution: "nodenext",
        },
      },
      "tsconfig.build": {
        include: ["{buildSource}"],
        compilerOptions: {
          outDir: "{source}",
        },
      },
      "esbuild": {
        entryPoints: ["{source}/index.js"],
        outfile: `{output}/${name}.js`,
        format: "cjs",
        bundle: true,
        platform: "node",
      },
    },
    variable: DEFAULT_VARIABLE,
  };
}
