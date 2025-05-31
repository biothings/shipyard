import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { neo4j_floating_subject_query } from './graph_sampling.ts';

const graph_sample = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '15s',
      env: { NUM_SAMPLE: '1', HTTP_TIMEOUT: '15s' },
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
    half_load: {
      executor: 'shared-iterations',
      startTime: '30s',
      gracefulStop: '60s',
      env: { NUM_SAMPLE: '500', HTTP_TIMEOUT: '750s' },
      vus: 15,
      iterations: 100,
      maxDuration: '60m',
    },
    full_load: {
      executor: 'shared-iterations',
      startTime: '60m',
      gracefulStop: '60s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '1200s' },
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
    timeout: '60s'
  };
  return { params: params }
}

export function teardown() {
  graph_sample.close();
}

export default function () {
  const payload: string = neo4j_floating_subject_query(graph_sample, 1000);
  const url: string = TestConfiguration["NEO4J_QUERY_URL"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}
