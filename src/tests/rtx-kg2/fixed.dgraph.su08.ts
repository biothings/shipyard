import http from "k6/http";
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

import { dgraphFixedQuery } from "../../lib/graph.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const graphDB = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  scenarios: {
    full_load: {
      executor: "shared-iterations",
      startTime: "0m",
      gracefulStop: "30s",
      env: { NUM_SAMPLE: "1000", HTTP_TIMEOUT: "300s" },
      vus: 5,
      iterations: 25,
      maxDuration: "10m",
    },
  },
};

export function setup() {
  const params = {
    headers: {
      "Content-Type": "application/dql",
    },
    timeout: "60s",
  };
  return { params: params };
}

export function teardown() {
  graphDB.close();
}

export default function (data: Object) {
  const payload: Uint8Array<ArrayBuffer> = dgraphFixedQuery(
    graphDB,
    __ENV.NUM_SAMPLE,
  );
  const url: string = EnvConfiguration["DGRAPH_QUERY_URL"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return {
    "/testoutput/fixed.dgraph.su08.ts.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: "→", enableColors: true }),
  };
}
