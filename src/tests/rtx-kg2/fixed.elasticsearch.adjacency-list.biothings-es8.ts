import { esFixedQuery, IndexName } from "../../lib/graph.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";
import http from "k6/http";

export { options } from "../../configuration/options.ts";
export { setup } from "../../configuration/setup.ts";
export { graphDbTeardown as teardown } from "../../configuration/teardown.ts";

import { graph_db } from "../../configuration/db.ts";
import { LoadPayload } from "../../typings/shipyard/load.ts";

export default function (data: LoadPayload) {
  const index: IndexName = "rtx_kg2_nodes_adjacency_list";
  const payload: string = esFixedQuery(graph_db, __ENV.NUM_SAMPLE, index);
  const url: string = EnvConfiguration["ES_QUERY_URL"]["su12"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return { "/testoutput/fixed.elasticsearch.adjacency-list.biothings-es8.ts.json": JSON.stringify(data) };
}
