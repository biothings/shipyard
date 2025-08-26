import http from "k6/http";
import sql from "k6/x/sql";

import { driver } from "k6/x/sql/driver/sqlite3";
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

import { ploverFloatingObjectQuery } from "../../lib/graph.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const graphDB = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  scenarios: {
    full_load: {
      executor: "shared-iterations",
      startTime: "0s",
      gracefulStop: "30s",
      env: { NUM_SAMPLE: "1", HTTP_TIMEOUT: "15s" },
      vus: 1000,
      iterations: 25000,
      maxDuration: "10m",
    },
  },
};

export function setup() {
  const params = {
    headers: {
      "Content-Type": "application/x-ndjson",
    },
    timeout: "60s",
  };
  return { params: params };
}

export function teardown() {
  graphDB.close();
}

export default function (data: Object) {
  const payload: string = ploverFloatingObjectQuery(graphDB, __ENV.NUM_SAMPLE);
  const url: string = EnvConfiguration["PLOVERDB_QUERY_URL"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return {
    "/testoutput/floating-object.ploverdb.transltr.ts.json": JSON.stringify(data),
    "stdout": textSummary(data, { indent: "→", enableColors: true }),
  };
}
