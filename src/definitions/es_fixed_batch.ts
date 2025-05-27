import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

const db = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  batch: 10,
  duration: '10m',
  iterations: 20,
  vus: 10,
};

export function teardown() {
  db.close();
}

export default function () {
  let samples: Array<{ subject: string, object: string, predicate: string }> = db.query(`
    SELECT * FROM graph_samples WHERE rowid IN
        (SELECT rowid FROM graph_samples ORDER BY random() LIMIT 10);
  `);


  let aggregated_statements: array = [];
  for (let graph_sample of samples) {
    aggregated_statements.push({index: "rtx_kg2_edges"});
    aggregated_statements.push(
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
    );
  }

  const url: string = 'http://su12:9200/_msearch';
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const payload: string = JSON.stringify(aggregated_statements);
  http.post(url, payload, params);
}
