import allModules from "./floating-es-meta/esFloatingMetaQuery.ts";

const { main } = allModules("predicate");

export * from "./floating-es-meta/esFloatingMetaQuery.ts";
export default main;

export function handleSummary(data) {
  return { "/testoutput/floating-predicate.elasticsearch.biothings-es8.ts.json": JSON.stringify(data) };
}
