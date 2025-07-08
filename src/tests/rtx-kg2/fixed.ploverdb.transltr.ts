import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { plover_fixed_query } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

const graph_db = sql.open(driver, "/src/data/graph_sample.db");


export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '15s',
      env: { NUM_SAMPLE: '3', HTTP_TIMEOUT: '10s'},
      vus: 1,
      iterations: 1,
      maxDuration: '10s',
    },
    full_load: {
      executor: 'shared-iterations',
      startTime: '20s',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '300s'},
      vus: 5,
      iterations: 25,
      maxDuration: '10m',
    }
  },
};


export function setup() {
  const params = {
    headers: {
      'Content-Type': 'application/x-ndjson',
    },
    timeout: '60s'
  };
  return { params: params }
}

export function teardown() {
  graph_db.close();
}

export default function (data: Object) {
  const payload: string = plover_fixed_query(graph_db, __ENV.NUM_SAMPLE);
  const url: string = EnvConfiguration["PLOVERDB_QUERY_URL"]
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return { "/testoutput/fixed.ploverdb.transltr.ts.json": JSON.stringify(data) };
}
