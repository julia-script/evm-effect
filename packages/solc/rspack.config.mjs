import path from "node:path";
import { defineConfig } from "@rspack/cli";
import rspack, { Compilation } from "@rspack/core";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

const root = path.join(new URL(".", import.meta.url).pathname);

const PLUGIN_NAME = "WrapCompiledOutput";

const jsAsset = /\.m?js$/;

/** @param {Compilation} compilation */
function getEntryJsAssetNames(compilation) {
  const names = new Set();
  for (const entrypoint of compilation.entrypoints.values()) {
    for (const chunk of entrypoint.chunks) {
      for (const file of chunk.files) {
        if (jsAsset.test(file)) {
          names.add(file);
        }
      }
    }
  }
  return [...names];
}

function fileStemToExportId(filename) {
  const base = filename.replace(/\.m?js$/, "");
  const id = base.replace(/[^a-zA-Z0-9_$]/g, "_");
  if (id.length === 0) {
    return "content";
  }
  if (/^[0-9]/.test(id)) {
    return `_${id}`;
  }
  return id;
}

/**
 * After emit, replaces each entry JS asset with
 * `export const <name> = "<escaped bundle source>"` so the compiled output is a string export.
 * Uses `content` when there is a single entry JS file; otherwise one export per file from the filename.
 */
class WrapCompiledOutput {
  /** @param {import("@rspack/core").Compiler} compiler */
  apply(compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          const entryJsNames = getEntryJsAssetNames(compilation);
          const single = entryJsNames.length === 1;

          for (const assetName of entryJsNames) {
            const asset = compilation.getAsset(assetName);
            if (!asset) {
              continue;
            }
            const raw = asset.source.source();
            const source =
              typeof raw === "string" ? raw : Buffer.from(raw).toString("utf8");
            const exportId = single ? "content" : fileStemToExportId(assetName);
            const wrapped = `export const ${exportId} = ${JSON.stringify(source)};\n`;
            compilation.updateAsset(
              assetName,
              new rspack.sources.RawSource(wrapped),
            );
          }
        },
      );
    });
  }
}
export default defineConfig({
  entry: {
    solcjs: "./solc.ts",
  },
  name: "solcjs",
  plugins: [
    new NodePolyfillPlugin({
      onlyAliases: ["process", "stream", "https", "http"],
    }),
    new WrapCompiledOutput(),
  ],
  target: "webworker",
  mode: "production",
  externalsType: "module-import",
  optimization: {
    concatenateModules: true,
    avoidEntryIife: true,
    minimize: false,
  },
  resolve: {},
  experiments: {
    outputModule: true,
  },
  lazyCompilation: false,
  output: {
    filename: "[name].bundle.js",
    path: path.join(root, "src", "generated"),
    module: true,
    chunkFormat: "module",
    library: {
      type: "modern-module",
    },

    chunkLoading: "import",
    workerChunkLoading: "import",
  },
});
