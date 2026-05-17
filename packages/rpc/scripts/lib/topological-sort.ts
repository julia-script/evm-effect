import type { SchemaEntry } from "./types.ts";

export function topologicalSort(schemas: SchemaEntry[]): SchemaEntry[] {
  const byName = new Map(schemas.map((item) => [item.name, item]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const item of schemas) {
    indegree.set(item.name, 0);
    dependents.set(item.name, []);
  }

  for (const item of schemas) {
    for (const depRef of item.deps) {
      const depName = depRef.split("/").pop() ?? "";
      if (!byName.has(depName)) {
        continue;
      }
      dependents.get(depName)?.push(item.name);
      indegree.set(item.name, (indegree.get(item.name) ?? 0) + 1);
    }
  }

  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([name]) => name)
    .sort();

  const sorted: SchemaEntry[] = [];
  while (queue.length > 0) {
    queue.sort();
    const name = queue.shift() as string;
    sorted.push(byName.get(name) as SchemaEntry);
    for (const dependent of dependents.get(name) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        queue.push(dependent);
      }
    }
  }

  if (sorted.length !== schemas.length) {
    const remaining = schemas
      .filter((item) => !sorted.some((s) => s.name === item.name))
      .map((item) => item.name);
    throw new Error(`Circular schema dependencies: ${remaining.join(", ")}`);
  }

  return sorted;
}
