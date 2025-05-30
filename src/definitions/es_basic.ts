import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { graph_samples } from './sampling.ts';

const graph_db = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  duration: '1m',
  iterations: 1,
  vus: 1,
};

export function teardown() {
  graph_db.close();
}

export default function () {
  let samples: Array<{object}> = graph_samples(graph_db, 1)
  let sampled_row: object = samples[0];
  
  const url: string = 'http://su12:9200/_search';
  const payload: string = JSON.stringify(
    {
      query : {
        bool : {
          filter : [
            {term : { 'subject.keyword' : sampled_row.subject }},
            {term : { 'object.keyword' : sampled_row.object}},
            {term : { 'predicate.keyword' : sampled_row.predicate}}
          ]
        }
      }
    }
  );

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s'
  };
  http.post(url, payload, params);
}
