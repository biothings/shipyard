import http from "k6/http";
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { nodenormElasticsearchQuery } from "../../lib/curie.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const curie_db = sql.open(driver, "/src/data/nodenorm_curie.db");

export const options = {
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
  const url: string = EnvConfiguration["NODENORM_QUERY_URL"]["ci"];
  const payload: string = nodenormElasticsearchQuery(
    curie_db,
    __ENV.NUM_SAMPLE,
  );
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return {
    "/testoutput/stress.elasticsearch.biothings-ci.ts.json":
      JSON.stringify(data),
  };
}
