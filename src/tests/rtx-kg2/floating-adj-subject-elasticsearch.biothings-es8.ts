import allModules from "./floating-es-meta/esFloatingMetaQuery.ts";

const { main, handleSummary } = allModules(
  "subject",
  "rtx_kg2_nodes_adjacency_list",
);

export * from "./floating-es-meta/esFloatingMetaQuery.ts";
export { handleSummary };
export default main;
