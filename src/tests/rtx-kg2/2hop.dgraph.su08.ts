import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { dgraphTwoHopQuery } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

const twohopDB = sql.open(driver, "/src/data/two-hop.db");


export const options = {
  scenarios: {
    full_load: {
      executor: 'shared-iterations',
      startTime: '0m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '50', HTTP_TIMEOUT: '300s'},
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
  twohopDB.close();
}

export default function (data: Object) {
  const payload: Uint8Array<ArrayBuffer> = dgraphTwoHopQuery(twohopDB, __ENV.NUM_SAMPLE);
  const url: string = EnvConfiguration["DGRAPH_QUERY_URL"]
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return { "/testoutput/2hop.dgraph.su08.ts.json": JSON.stringify(data) };
}
