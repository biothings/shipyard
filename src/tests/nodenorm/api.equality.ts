import { check } from 'k6';
import http from "k6/http";
import sql from "k6/x/sql";
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';

import driver from "k6/x/sql/driver/sqlite3";

import { curieSamples } from "../../lib/sampling.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const curieDB = sql.open(driver, "/src/data/nodenorm_curie.db");

const unexpectedResponseDifference = new Counter("different_response_counter");

export const options = {
  thresholds: {checks: ['rate==1.00']},
  scenarios: {
    base_api_comparison: {
      executor: "shared-iterations",
      startTime: "0",
      gracefulStop: "5s",
      env: { NUM_SAMPLE: "1000", HTTP_TIMEOUT: "20s", CONFLATION: "false" },
      vus: 1,
      iterations: 50,
      maxDuration: "10m",
    },
    conflation_api_comparison: {
      executor: "shared-iterations",
      startTime: "0",
      gracefulStop: "5s",
      env: { NUM_SAMPLE: "1000", HTTP_TIMEOUT: "20s", CONFLATION: "true" },
      vus: 1,
      iterations: 50,
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
  let curies: Array<Object> = curieSamples(curieDB, __ENV.NUM_SAMPLE);

  let pendingBody: Object = {
    curie: curies,
    conflate: JSON.parse(__ENV.CONFLATION.toLowerCase()),
    description: false,
    drug_chemical_conflate: JSON.parse(__ENV.CONFLATION.toLowerCase()),
  };

  let renciBody: Object = {
    curies: curies,
    conflate: JSON.parse(__ENV.CONFLATION.toLowerCase()),
    description: false,
    drug_chemical_conflate: JSON.parse(__ENV.CONFLATION.toLowerCase()),
  };

  data.params.timeout = __ENV.HTTP_TIMEOUT;

  const renciNodenormURL: string = EnvConfiguration["NODENORM_QUERY_URL"]["renci"];
  const renciResponse = http.post(renciNodenormURL, JSON.stringify(renciBody), data.params);

  const pendingNodenormURL: string = EnvConfiguration["NODENORM_QUERY_URL"]["ci"];
  const pendingResponse = http.post(pendingNodenormURL, JSON.stringify(pendingBody), data.params);

  let resultComparison: boolean = renciResponse.body == pendingResponse.body;
  console.log(`Iteration ${exec.instance.iterationsCompleted} | Comparison Result: ${resultComparison}`);

  if (!resultComparison) {
    unexpectedResponseDifference.add(1, {renci: renciResponse.body.toString(), pending: pendingResponse.body.toString()});
  }

  check(pendingResponse, {
    "API Response Equality": (pendingResponse) => pendingResponse.body === renciResponse.body
  });
}

export function handleSummary(data) {
  return { "/testoutput/nodenorm.api.equality.ts.json": JSON.stringify(data) };
}
