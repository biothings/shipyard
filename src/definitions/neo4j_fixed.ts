import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { neo4j_fixed_query } from './graph_sampling.ts';
import { TestConfiguration } from './configuration.ts';

const graph_db = sql.open(driver, "/src/data/graph_sample.db")

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '1', HTTP_TIMEOUT: '15s' },
      vus: 1,
      iterations: 1,
      maxDuration: '60s',
    },
    half_load: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '60s',
      env: { NUM_SAMPLE: '500', HTTP_TIMEOUT: '600s' },
      vus: 15,
      iterations: 100,
      maxDuration: '60m',
    },
    full_load: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '60s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '600s' },
      vus: 5,
      iterations: 25,
      maxDuration: '60m',
    }
  },
};

export function setup() {
  const USERNAME: string = `${__ENV.NEO4J_USERNAME}`;
  const PASSWORD: string = `${__ENV.NEO4J_PASSWORD}`;
  const credentials = encoding.b64encode(`${USERNAME}:${PASSWORD}`);

  const params = {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
  };
  return { params: params }
}


export function teardown(data: Object) {
  graph_db.close();
}

export default function (data: Object) {
  const payload: string = neo4j_fixed_query(graph_db, __ENV.NUM_SAMPLE)
  const url: string = TestConfiguration["NEO4J_QUERY_URL"];
  data.params.HTTP_TIMEOUT = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}
