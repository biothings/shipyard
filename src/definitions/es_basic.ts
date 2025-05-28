import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

const db = sql.open(driver, "/src/data/graph_sample.db");

export const options = {
  duration: '1m',
  iterations: 1,
  vus: 1,
};

export function teardown() {
  db.close();
}

export default function () {
  let samples: Array<{ subject: string, object: string, predicate: string }> = db.query(`
    SELECT * FROM graph_samples WHERE rowid IN
        (SELECT rowid FROM graph_samples ORDER BY random() LIMIT 1);
  `);
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
  console.log(payload);

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  http.post(url, payload, params);
}
