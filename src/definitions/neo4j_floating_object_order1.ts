import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { neo4j_floating_object_query } from './graph_sampling.ts';

const graph_sample = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  vus: 5,
  iterations: 25,
  duration: '60m',
};


export function teardown() {
  graph_sample.close();
}

export default function () {
  const url: string = "http://su08:7474/db/neo4j/tx/commit";
  const credentials: string = encoding.b64encode(`${__ENV.NEO4J_USERNAME}:${__ENV.NEO4J_PASSWORD}`);
  const params: object = {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    timeout: '1200s'
  };
  const payload: string = neo4j_floating_object_query(graph_sample, 1000)
  http.post(url, payload, params);
}
