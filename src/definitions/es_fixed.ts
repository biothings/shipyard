import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { es_fixed_query } from './graph_sampling.ts';
import { TestConfiguration } from './configuration.ts';

const graph_db = sql.open(driver, "/src/data/graph_sample.db");


export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '15s',
      env: { NUM_SAMPLE: '1', HTTP_TIMEOUT: '15s'},
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
    quarter_load: {
      executor: 'shared-iterations',
      startTime: '30s',
      gracefulStop: '15s',
      env: { NUM_SAMPLE: '250', HTTP_TIMEOUT: '120s'},
      vus: 20,
      iterations: 100,
      maxDuration: '10m',
    },
    half_load: {
      executor: 'shared-iterations',
      startTime: '11m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '500', HTTP_TIMEOUT: '120s'},
      vus: 15,
      iterations: 50,
      maxDuration: '10m',
    },
    full_load: {
      executor: 'shared-iterations',
      startTime: '22m',
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
  const index: string = "rtx_kg2_edges";
  const payload: string = es_fixed_query(graph_db, __ENV.NUM_SAMPLE, index);
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(TestConfiguration["ES_QUERY_URL"][0], payload, data.params);
}
