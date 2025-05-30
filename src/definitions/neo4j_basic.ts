import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { neo4j_fixed } from './graph_sampling.ts';

const graph_sample = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  duration: '1m',
  iterations: 1,
  vus: 1,
};

export function teardown() {
  graph_sample.close();
}

export default function () {
  const payload: string = neo4j_fixed(graph_db, 1000)
  const url: string = "http://su08:7474/db/neo4j/tx/commit";
  const credentials = encoding.b64encode(`${__ENV.NEO4J_USERNAME}:${NEO4J_PASSWORD}`);
  const params = {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
  };
  http.post(url, payload, params);
}
