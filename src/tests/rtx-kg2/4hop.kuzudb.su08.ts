import http from "k6/http";
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

import { kuzudbFourHopQuery } from "../../lib/graph.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const fourhopDB = sql.open(driver, "/src/data/four-hop.db");
const tableName: string = "fourhop";

export const options = {
  scenarios: {
    full_load: {
      executor: "shared-iterations",
      startTime: "0m",
      gracefulStop: "30s",
      env: { NUM_SAMPLE: "1000", HTTP_TIMEOUT: "300s" },
      vus: 5,
      iterations: 25,
      maxDuration: "20m",
    },
  },
};

export function setup() {
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: "60s",
  };
  return { params: params };
}

export function teardown() {
  fourhopDB.close();
}

export default function (data: Object) {
  const payload: string = kuzudbFourHopQuery(
    fourhopDB,
    tableName,
    __ENV.NUM_SAMPLE,
    500,
  );
  const url: string = EnvConfiguration["KUZUDB_QUERY_URL"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return {
    "/testoutput/4hop.kuzudb.su08.ts.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: "→", enableColors: true }),
  };
}
