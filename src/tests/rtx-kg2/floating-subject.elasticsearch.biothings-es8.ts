import allModules from "./floating-es-meta/esFloatingMetaQuery.ts";

const { main } = allModules("subject");

export * from "./floating-es-meta/esFloatingMetaQuery.ts";
export default main;

export function handleSummary(data) {
  return { "/testoutput/floating-subject.elasticsearch.biothings-es8.ts.json": JSON.stringify(data) };
}
