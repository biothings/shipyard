import { es_fixed_query } from "../../lib/graph.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";
import http from "k6/http";

export { options } from "../../configuration/options.ts";
export { setup } from "../../configuration/setup.ts";
export { graphDbTeardown as teardown } from "../../configuration/teardown.ts";

import { graph_db } from "../../configuration/db.ts";
import { LoadPayload } from "../../typings/shipyard/load.ts";

export default function (data: LoadPayload) {
  const index: string = "rtx_kg2_edges";
  const payload: string = es_fixed_query(graph_db, __ENV.NUM_SAMPLE, index);
  const url: string = EnvConfiguration["ES_QUERY_URL"]["su12"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}
