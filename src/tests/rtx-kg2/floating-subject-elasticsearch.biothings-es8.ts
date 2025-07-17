import {getMain} from "./floating-es-meta/esFloatingMetaQuery.ts";
export * from "./floating-es-meta/esFloatingMetaQuery.ts";

export default getMain('subject');

export function handleSummary(data) {
  return { './testoutput/rtx-kg2/floating-subject-elasticsearch.biothings-es8.ts.json' : JSON.stringify(data) };
}
