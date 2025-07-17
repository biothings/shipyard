import {LoadPayload} from "../../../typings/shipyard/load.ts";
import {FloatingField, generateEsFloatingQuerier} from "../../../lib/graph.ts";
import {graph_db} from "../../../configuration/db.ts";
import {EnvConfiguration} from "../../../configuration/environment.ts";
import http from "k6/http";


export { options } from '../../../configuration/options.ts'
export { setup } from '../../../configuration/setup.ts'
export { graphDbTeardown as teardown } from '../../../configuration/teardown.ts'

const INDEX: string = "rtx_kg2_edges_merged";


export const getMain = (floatingField: FloatingField) => (data: LoadPayload)  => {

  // use merged index
  const floatingField = 'subject'
  const querier = generateEsFloatingQuerier(floatingField)
  const payload: string = querier(graph_db, __ENV.NUM_SAMPLE, INDEX);

  const url: string = EnvConfiguration["ES_QUERY_URL"]["su12"]
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}


function handleSummary(data) {
  return { './testoutput/rtx-kg2/floating-subject-elasticsearch.biothings-es8.ts.json' : JSON.stringify(data) };
}