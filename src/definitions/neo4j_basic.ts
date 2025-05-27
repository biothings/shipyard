import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

const graph_db = sql.open(driver, "/src/data/graph_sample.db");

const USERNAME: string = "";
const PASSWORD: string = "";

export const options = {
  batch: 10,
  duration: '10m',
  iterations: 100,
  vus: 10,
};

export function teardown() {
  graph_db.close();
}

export default function () {
  let samples: Array<{object}> = graph_db.query(`
    SELECT * FROM graph_samples WHERE rowid IN
        (SELECT rowid FROM graph_samples ORDER BY random() LIMIT 1);

  `);

  const url: string = "http://su08:7474/db/neo4j/tx/commit";

  let statements: array = [];
  for (let graph_sample of samples) {
    let subject_type: string = graph_sample.subject_type
    let object_type: string = graph_sample.object_type
    let predicate: string = graph_sample.predicate

    let statement: object = {
      statement : 'MATCH (`n0`:`${subject_type}` {`id`: "$subject"})-[`e01`:`${predicate}`]->(`n1`:`${object_type}` {`id`: "$object"}) RETURN *;',
      parameters : {
        subject : graph_sample.subject,
        object : graph_sample.object,
      }
    }
    statements.push(statement)
  }

  const payload: string = JSON.stringify(statements);

  const credentials = encoding.b64encode(`${USERNAME}:${PASSWORD}`);
  const params = {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
  };
  http.post(url, payload, params);
}
