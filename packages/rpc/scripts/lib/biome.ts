import * as fs from "node:fs/promises";
import { Biome, Distribution } from "@biomejs/js-api";
import { Data, Effect } from "effect";
import { biomeConfigPath } from "./paths.js";

const biome = await Biome.create({ distribution: Distribution.NODE });
const { projectKey } = biome.openProject("");

const biomeConfig = await fs.readFile(biomeConfigPath, "utf-8");

export class BiomeError extends Data.TaggedError("BiomeError")<{
  readonly message: string;
}> {}

export const formatGeneratedSchemas = (content: string) =>
  Effect.try({
    try: () => {
      biome.applyConfiguration(projectKey, JSON.parse(biomeConfig));
      const formatted = biome.formatContent(projectKey, content, {
        filePath: "src/schemas/generated-schemas.ts",
      });
      return formatted;
    },
    catch: (error) => new BiomeError({ message: String(error) }),
  });
