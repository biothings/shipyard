import check from 'k6';
import http from "k6/http";
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { redisNodenormQuery } from "../../lib/curie.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const curieDB = sql.open(driver, "/src/data/nodenorm_curie.db");

export const options = {
  thresholds: {checks: ['rate==1.0']},
  scenarios: {
    api_comparison: {
      executor: "shared-iterations",
      startTime: "0",
      gracefulStop: "5s",
      env: { NUM_SAMPLE: "1000", HTTP_TIMEOUT: "20s" },
      vus: 1,
      iterations: 100,
      maxDuration: "10m",
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
  curieDB.close();
}

export default function (data: Object) {
  const payload: string = redisNodenormQuery(curieDB, __ENV.NUM_SAMPLE);
  console.log(payload)
  data.params.timeout = __ENV.HTTP_TIMEOUT;

  const renciNodenormURL: string = EnvConfiguration["NODENORM_QUERY_URL"]["renci"];
  const renciResponse = http.post(renciNodenormURL, payload, data.params);

  const pendingNodenormURL: string = EnvConfiguration["NODENORM_QUERY_URL"]["ci"];
  const pendingResponse = http.post(pendingNodenormURL, payload, data.params);

  let resultComparison: boolean = renciResponse.json() == pendingResponse.json();

  check(resultComparison, {
    "API Response Equality": (resultComparison) => resultComparison === true
  });
}

export function handleSummary(data) {
  return { "/testoutput/nodenorm.api.equality.ts.json": JSON.stringify(data) };
}
