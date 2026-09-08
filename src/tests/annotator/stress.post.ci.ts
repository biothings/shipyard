import http from "k6/http";
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

import { annotatorCurieBatchBody } from "../../lib/annotator.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const curie_db = sql.open(driver, "/src/data/annotator_curie.db");

export const options = {
  // 'url' is intentionally omitted: it holds the raw request URL, which
  // would blow up metric cardinality. 'name' (see http.url below) is the
  // low-cardinality substitute.
  systemTags: [
    "proto",
    "subproto",
    "status",
    "method",
    "name",
    "group",
    "check",
    "error",
    "error_code",
    "tls_version",
    "scenario",
    "service",
    "expected_response",
  ],
  scenarios: {
    full_load: {
      executor: "shared-iterations",
      startTime: "0s",
      gracefulStop: "5s",
      env: { NUM_SAMPLE: "1000", HTTP_TIMEOUT: "60s" },
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
  const payload: string = annotatorCurieBatchBody(curie_db, __ENV.NUM_SAMPLE);
  const queryBackend: string = __ENV.QUERY_BACKEND || "es";
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(
    http.url`${url}/curie?query_backend=${encodeURIComponent(queryBackend)}`,
    payload,
    data.params,
  );
}

export function handleSummary(data) {
  return {
    "/testoutput/stress.post.ci.ts.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: "→", enableColors: true }),
  };
}
