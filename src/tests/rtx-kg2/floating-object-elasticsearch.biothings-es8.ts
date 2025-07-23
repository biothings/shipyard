import allModules from "./floating-es-meta/esFloatingMetaQuery.ts";

const { main, handleSummary } = allModules("object");

export * from "./floating-es-meta/esFloatingMetaQuery.ts";
export { handleSummary };
export default main;
