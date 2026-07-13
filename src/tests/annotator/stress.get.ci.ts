import http from "k6/http";
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

import { annotatorSingleCurie } from "../../lib/annotator.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const curie_db = sql.open(driver, "/src/data/annotator_curie.db");

export const options = {
  scenarios: {
    full_load: {
      executor: "shared-iterations",
      startTime: "0s",
      gracefulStop: "5s",
      env: { HTTP_TIMEOUT: "60s" },
      vus: 5,
      iterations: 250,
      maxDuration: "15m",
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
  curie_db.close();
}

export default function (data: Object) {
  const url: string = EnvConfiguration["ANNOTATOR_QUERY_URL"]["ci"];
  const curie: string = annotatorSingleCurie(curie_db);
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.get(`${url}/curie/${encodeURIComponent(curie)}`, data.params);
}

export function handleSummary(data) {
  return {
    "/testoutput/stress.get.ci.ts.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: "→", enableColors: true }),
  };
}
