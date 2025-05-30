import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { graph_samples } from './sampling.ts';

const db = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  vus: 5,
  iterations: 25,
  duration: '60m',
};

export function teardown() {
  db.close();
}

export default function () {
  let samples: Array<{object}> = graph_samples(graph_db, 1000)

  let aggregated_statements: array = [];
  for (let graph_sample of samples) {
    aggregated_statements.push(JSON.stringify({index: "rtx_kg2_edges"}));
    aggregated_statements.push(
      JSON.stringify(
        {
          query : {
            bool : {
              filter : [
                {term : { 'subject.keyword' : graph_sample.subject }},
                {term : { 'object.keyword' : graph_sample.object}},
                {term : { 'predicate.keyword' : graph_sample.predicate}}
              ]
            }
          }
        }
      )
    );
  }

  const url: string = 'http://su12:9200/_msearch';
  const params = {
    headers: {
      'Content-Type': 'application/x-ndjson',
    },
    timeout: '900s'
  };
  const payload: string = aggregated_statements.join("\n") + "\n";
  http.post(url, payload, params);
}
