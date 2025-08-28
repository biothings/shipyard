import allModules from "./floating-es-meta/esFloatingMetaQuery.ts";

const { main } = allModules(
  "subject",
  "rtx_kg2_nodes_adjacency_list",
);

export * from "./floating-es-meta/esFloatingMetaQuery.ts";
export default main;

export function handleSummary(data) {
  return { "/testoutput/floating-subject.elasticsearch.adjacency-list.biothings-es8.ts.json": JSON.stringify(data) };
}
