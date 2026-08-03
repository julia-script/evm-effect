/**
 * Generates the `/docs/api` section of the site from the TSDoc comments in the
 * workspace packages.
 *
 * TypeDoc (configured in `apps/docs/typedoc.json`, with per-package settings in
 * `packages/*\/typedoc.json`) emits plain markdown into `.typedoc`. This script
 * turns that raw output into a Fumadocs content tree:
 *
 *  - `@evm-effect/<pkg>/…` folders are flattened to `<pkg>/…` and every
 *    cross-reference is rewritten to the new location,
 *  - each page gets Fumadocs frontmatter (`title` / `description`),
 *  - a `meta.json` is written for every folder so the sidebar keeps a stable,
 *    meaningful order instead of falling back to alphabetical file names.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workspaceRoot = path.resolve(docsRoot, "../..");
const typedocOut = path.join(docsRoot, ".typedoc");
const contentOut = path.join(docsRoot, "content/docs/api");

const SCOPE = "@evm-effect/";

/** Packages in sidebar order, and how they are introduced on the index page. */
const PACKAGES = [
  "evm",
  "solc",
  "ethereum-types",
  "crypto",
  "rlp",
  "rpc",
  "shared",
] as const;

/** Order and display names for the reflection-kind folders TypeDoc emits. */
const KIND_FOLDERS: Record<string, string> = {
  namespaces: "Namespaces",
  classes: "Classes",
  interfaces: "Interfaces",
  functions: "Functions",
  "type-aliases": "Type Aliases",
  variables: "Variables",
  enumerations: "Enumerations",
  documents: "Documents",
};

const kindOrder = Object.keys(KIND_FOLDERS);

type PackageJson = { name: string; description?: string; version?: string };

const readPackageJson = async (pkg: string): Promise<PackageJson> =>
  JSON.parse(
    await fs.readFile(
      path.join(workspaceRoot, "packages", pkg, "package.json"),
      "utf8",
    ),
  );

const runTypedoc = () => {
  console.log("[api] running typedoc…");
  execFileSync("typedoc", ["--options", "typedoc.json"], {
    cwd: docsRoot,
    stdio: "inherit",
    env: process.env,
  });
};

const walk = async (dir: string, base = dir): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full, base);
      return [path.relative(base, full).split(path.sep).join("/")];
    }),
  );
  return files.flat();
};

/**
 * When two exports share a name (an Effect schema and its inferred type, for
 * example) TypeDoc disambiguates the second file with a `-1` suffix. That
 * collides with the ids Fumadocs derives for the sections of the first page
 * (`<url>-<n>`) and breaks the search index, so the suffix is reshaped into
 * something that cannot be mistaken for a section index.
 *
 * TypeScript identifiers never contain a hyphen, so a trailing `-<digits>` is
 * always TypeDoc's doing.
 */
const DEDUPE_SUFFIX = /^(.+)-(\d+)$/;

/**
 * `@evm-effect/crypto/functions/keccak256.md` -> `crypto/functions/keccak256.mdx`.
 * Returns `null` for files that are replaced by hand-written content.
 */
const toContentPath = (file: string): string | null => {
  if (!file.startsWith(SCOPE)) return null; // typedoc's own root index
  const rest = file.slice(SCOPE.length).replace(/\.md$/, "");
  const dir = path.posix.dirname(rest);
  const name = path.posix.basename(rest);
  const deduped = DEDUPE_SUFFIX.exec(name);
  const finalName = deduped ? `${deduped[1]}-alt${deduped[2]}` : name;
  return `${dir === "." ? "" : `${dir}/`}${finalName}.mdx`;
};

const escapeYaml = (value: string) =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** Splits the leading `# Title` heading off a TypeDoc page. */
const takeTitle = (markdown: string): { title?: string; body: string } => {
  const lines = markdown.split("\n");
  const index = lines.findIndex((line) => line.trim().length > 0);
  const heading = index >= 0 ? /^#\s+(.*)$/.exec(lines[index] ?? "") : null;
  if (!heading) return { body: markdown.trim() };
  lines.splice(0, index + 1);
  return { title: heading[1]?.trim(), body: lines.join("\n").trim() };
};

/**
 * TypeDoc titles look like `Function: keccak256()` or `Class: RlpDecodeError`.
 * The kind is already conveyed by the sidebar folder, so it moves to the
 * page description and the symbol name becomes the title.
 */
const splitKind = (title: string): { name: string; kind?: string } => {
  const match = /^([A-Za-z ]+):\s+(.*)$/.exec(title);
  if (!match) return { name: title };
  return { kind: match[1], name: match[2] ?? title };
};

/**
 * Inherited members are declared in dependencies, so their "Defined in" line
 * points inside `node_modules` — a path that does not exist on GitHub.
 */
const dropExternalSources = (body: string) =>
  body
    .split("\n")
    .filter(
      (line) =>
        !(line.startsWith("Defined in:") && line.includes("node\\_modules")),
    )
    .join("\n");

/** Rewrites every relative link so it points at the flattened content tree. */
const rewriteLinks = (
  body: string,
  sourceFile: string,
  mapping: Map<string, string>,
) => {
  const sourceDir = path.posix.dirname(sourceFile);
  const targetFile = mapping.get(sourceFile);
  if (!targetFile) return body;
  const targetDir = path.posix.dirname(targetFile);

  return body.replace(/\]\(([^)\s]+?)\)/g, (match, href: string) => {
    if (/^(?:[a-z]+:|\/|#)/i.test(href)) return match;
    const [rawPath, anchor] = href.split("#");
    if (!rawPath) return match;

    const resolved = path.posix.normalize(
      path.posix.join(sourceDir, decodeURI(rawPath)),
    );
    const mapped = mapping.get(resolved);
    if (!mapped) return match;

    let relative = path.posix.relative(targetDir, mapped);
    if (!relative.startsWith(".")) relative = `./${relative}`;
    return `](${relative}${anchor ? `#${anchor}` : ""})`;
  });
};

const writeFile = async (file: string, contents: string) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    contents.endsWith("\n") ? contents : `${contents}\n`,
    "utf8",
  );
};

const writeMeta = async (dir: string, meta: Record<string, unknown>) =>
  writeFile(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

const generateIndex = async (packages: PackageJson[]) => {
  const cards = packages
    .map(
      (pkg) =>
        `  <Card title="${pkg.name}" href="/docs/api/${pkg.name.slice(SCOPE.length)}">\n    ${pkg.description ?? ""}\n  </Card>`,
    )
    .join("\n");

  await writeFile(
    path.join(contentOut, "index.mdx"),
    `---
title: API Reference
description: Generated from the TSDoc comments of every published evm-effect package.
---

These pages are generated from the source of each package on every build, so
they always match the code that is published.

<Cards>
${cards}
</Cards>
`,
  );
};

const main = async () => {
  runTypedoc();

  await fs.rm(contentOut, { recursive: true, force: true });

  const files = (await walk(typedocOut)).filter((file) => file.endsWith(".md"));

  const mapping = new Map<string, string>();
  for (const file of files) {
    const target = toContentPath(file);
    if (target) mapping.set(file, target);
  }

  const packageJsons = new Map<string, PackageJson>();
  for (const pkg of PACKAGES) packageJsons.set(pkg, await readPackageJson(pkg));

  // Folders that need a meta.json, keyed by content-relative folder path.
  const folders = new Set<string>();

  for (const [source, target] of mapping) {
    const raw = await fs.readFile(path.join(typedocOut, source), "utf8");
    const { title, body } = takeTitle(raw);
    const [pkg] = target.split("/");
    const packageJson = pkg ? packageJsons.get(pkg) : undefined;

    const isPackageIndex = target === `${pkg}/index.mdx`;
    const { name, kind } = splitKind(
      title ?? path.posix.basename(target, ".mdx"),
    );

    // Keep the two entries of a same-named pair apart in the sidebar.
    const alt = /-alt(\d+)\.mdx$/.exec(target);
    const displayName = alt ? `${name} (${Number(alt[1]) + 1})` : name;

    const frontmatter = [
      `title: ${escapeYaml(isPackageIndex ? (packageJson?.name ?? name) : displayName)}`,
    ];
    const description = isPackageIndex
      ? packageJson?.description
      : kind && packageJson
        ? `${kind} exported from ${packageJson.name}.`
        : undefined;
    if (description)
      frontmatter.push(`description: ${escapeYaml(description)}`);

    const rendered = dropExternalSources(rewriteLinks(body, source, mapping));
    const content = `---\n${frontmatter.join("\n")}\n---\n\n${rendered}\n`;
    await writeFile(path.join(contentOut, target), content);

    const folder = path.posix.dirname(target);
    if (folder !== ".") folders.add(folder);
  }

  const documented = PACKAGES.filter((pkg) =>
    mapping.has(`${SCOPE}${pkg}/index.md`),
  );

  await generateIndex(
    documented
      .map((pkg) => packageJsons.get(pkg))
      .filter((pkg): pkg is PackageJson => !!pkg),
  );

  // Sidebar: API Reference -> package -> kind -> symbol.
  await writeMeta(contentOut, {
    title: "API Reference",
    icon: "Braces",
    pages: ["index", ...documented],
  });

  for (const pkg of documented) {
    const kinds = kindOrder.filter((kind) => folders.has(`${pkg}/${kind}`));
    await writeMeta(path.join(contentOut, pkg), {
      title: packageJsons.get(pkg)?.name ?? pkg,
      pages: ["index", ...kinds],
    });

    for (const kind of kinds) {
      const dir = path.join(contentOut, pkg, kind);
      const pages = (await fs.readdir(dir))
        .filter((file) => file.endsWith(".mdx"))
        .map((file) => path.basename(file, ".mdx"))
        .sort((a, b) => a.localeCompare(b));
      await writeMeta(dir, { title: KIND_FOLDERS[kind] ?? kind, pages });
    }
  }

  await fs.rm(typedocOut, { recursive: true, force: true });

  console.log(
    `[api] wrote ${mapping.size + 1} pages for ${documented.length} packages to content/docs/api`,
  );
};

await main();
