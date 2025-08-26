import http from "k6/http";
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export { graphDbTeardown as teardown } from "../../configuration/teardown.ts";
export { options } from "../../configuration/options.ts";
export { setup } from "../../configuration/setup.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";
import { esFixedQuery, IndexName } from "../../lib/graph.ts";
import { graph_db } from "../../configuration/db.ts";
import { LoadPayload } from "../../typings/shipyard/load.ts";


const respSizeTrend = new Trend('http_resp');

export default function (data: LoadPayload) {
  const index: IndexName = "rtx_kg2_nodes_adjacency_list";
  const payload: string = esFixedQuery(graph_db, __ENV.NUM_SAMPLE, index);
  const url: string = EnvConfiguration["ES_QUERY_URL"]["su12"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  const resp: http.Response = http.post(url, payload, data.params);
  respSizeTrend.add(resp.body.length);
}

export function handleSummary(data) {
  return { 
     "/testoutput/fixed-adjacency-list.elasticsearch.biothings-es8.ts.json": JSON.stringify(data),
    "stdout": textSummary(data, { indent: "→", enableColors: true }),
 };
}
