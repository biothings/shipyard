import http from 'k6/http';
import sql from "k6/x/sql";

import { Trend } from 'k6/metrics';
import driver from "k6/x/sql/driver/sqlite3";
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

import { dgraphThreeHopQuery } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

const threehopDB = sql.open(driver, "/src/data/three-hop.db");
const tableName: string = "threehop";

const respSizeTrend = new Trend('http_resp');

export const options = {
  scenarios: {
    full_load: {
      executor: 'shared-iterations',
      startTime: '0m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '300s'},
      vus: 5,
      iterations: 100,
      maxDuration: '20m',
    }
  },
};


export function setup() {
  const params = {
    headers: {
      'Content-Type': 'application/dql',
    },
    timeout: '60s'
  };
  return { params: params }
}

export function teardown() {
  threehopDB.close();
}

export default function (data: Object) {
  const payload: Uint8Array<ArrayBuffer> = dgraphThreeHopQuery(threehopDB, tableName, __ENV.NUM_SAMPLE, 100);
  const url: string = EnvConfiguration["DGRAPH_QUERY_URL"]
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  const resp: http.Response = http.post(url, payload, data.params);
  respSizeTrend.add(resp.body.length);
}

export function handleSummary(data) {
  return { 
    "/testoutput/3hop.dgraph.su08.ts.json": JSON.stringify(data),
    "stdout": textSummary(data, { indent: "→", enableColors: true }), 
  };
}
