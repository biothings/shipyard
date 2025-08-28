import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { dgraphFiveHopQuery } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

const fivehopDB = sql.open(driver, "/src/data/five-hop.db");
const tableName: string = "fivehop";


export const options = {
  scenarios: {
    full_load: {
      executor: 'shared-iterations',
      startTime: '0m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '300s'},
      vus: 5,
      iterations: 1000,
      maxDuration: '15m',
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
  fivehopDB.close();
}

export default function (data: Object) {
  const payload: Uint8Array<ArrayBuffer> = dgraphFiveHopQuery(fivehopDB, tableName, __ENV.NUM_SAMPLE, 1000);
  const url: string = EnvConfiguration["DGRAPH_QUERY_URL"]
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return { "/testoutput/5hop.dgraph.su08.ts.json": JSON.stringify(data) };
}
