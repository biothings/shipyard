import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { neo4j_fixed } from './graph_sampling.ts';

const graph_db = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  scenarios: {
    es_sanity: {
      executor: 'shared-iterations',

      startTime: '0s',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: 1 },

      vus: 1,
      iterations: 1,
      maxDuration: '60s',
    },
    full_load: {
      executor: 'shared-iterations',

      startTime: '0s',
      gracefulStop: '60s',
      env: { NUM_SAMPLE: 1000 },

      vus: 5,
      iterations: 25,
      maxDuration: '60m',
    },
  },
};


export function teardown() {
  graph_db.close();
}

export default function () {
  const payload: string = neo4j_fixed(graph_db, __ENV.NUM_SAMPLE)
  const url: string = "http://su08:7474/db/neo4j/tx/commit";
  const USERNAME: string = `${__ENV.NEO4J_USERNAME}`;
  const PASSWORD: string = `${__ENV.NEO4J_PASSWORD}`;
  const credentials = encoding.b64encode(`${USERNAME}:${PASSWORD}`);
  const params = {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    timeout: '900s'
  };
  http.post(url, payload, params);
}
