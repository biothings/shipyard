import { LoadPayload } from "../../../typings/shipyard/load.ts";
import {
  FloatingField,
  generateEsFloatingQuerier,
  IndexName,
} from "../../../lib/graph.ts";
import { graph_db } from "../../../configuration/db.ts";
import { EnvConfiguration } from "../../../configuration/environment.ts";
import http from "k6/http";

const getMain =
  (floatingField: FloatingField, index: IndexName) => (data: LoadPayload) => {
    const querier = generateEsFloatingQuerier(floatingField);
    const payload: string = querier(graph_db, __ENV.NUM_SAMPLE, index);
    const url: string = EnvConfiguration["ES_QUERY_URL"]["su12"];
    data.params.timeout = __ENV.HTTP_TIMEOUT;
    http.post(url, payload, data.params);
  };

const getSummaryHandler = (naming: string) => (data) => {
  return {
    [`/testoutput/floating-${naming}-elasticsearch.biothings-es8.ts.json`]:JSON.stringify(data),
  };
};

// pass generated main and handleSummary methods based on floating fields given
const allModules = (
  floatingField: FloatingField,
  index: IndexName = "rtx_kg2_edges_merged", // backwards compatibility
) => {
  const main = getMain(floatingField, index);
  const handleSummary = getSummaryHandler(floatingField + "-" + index);
  return {
    main,
    handleSummary,
  };
};

export { options } from "../../../configuration/options.ts";
export { setup } from "../../../configuration/setup.ts";
export { graphDbTeardown as teardown } from "../../../configuration/teardown.ts";

export default allModules;
