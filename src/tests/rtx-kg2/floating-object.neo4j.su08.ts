import encoding from "k6/encoding";
import http from "k6/http";
import sql from "k6/x/sql";

import { Trend } from "k6/metrics";
import driver from "k6/x/sql/driver/sqlite3";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

import { neo4jFloatingObjectQuery } from "../../lib/graph.ts";
import { EnvConfiguration } from "../../configuration/environment.ts";

const graphDB = sql.open(driver, "/src/data/graph_sample.db");

const respSizeTrend = new Trend("http_resp");

export const options = {
  scenarios: {
    full_load: {
      executor: "shared-iterations",
      startTime: "2m",
      gracefulStop: "60s",
      env: { NUM_SAMPLE: "1000", HTTP_TIMEOUT: "1500s" },
      vus: 5,
      iterations: 25,
      maxDuration: "60m",
    },
  },
};

export function setup() {
  const USERNAME: string = `${__ENV.NEO4J_USERNAME}`;
  const PASSWORD: string = `${__ENV.NEO4J_PASSWORD}`;
  const credentials = encoding.b64encode(`${USERNAME}:${PASSWORD}`);

  const params = {
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    timeout: "60s",
  };
  return { params: params };
}

export function teardown() {
  graphDB.close();
}

export default function (data: Object) {
  const payload: string = neo4jFloatingObjectQuery(graphDB, __ENV.NUM_SAMPLE);
  const url: string = EnvConfiguration["NEO4J_QUERY_URL"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  const resp: http.Response = http.post(url, payload, data.params);
  respSizeTrend.add(resp.body.length);
}

export function handleSummary(data) {
  return {
    "/testoutput/floating-object.neo4j.su08.ts.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: "→", enableColors: true }),
  };
}
