import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { graph_samples } from './sampling.ts';

const graph_db = sql.open(driver, "/src/data/graph_sample.db");


export const options = {
  vus: 5,
  iterations: 25,
  duration: '60m',
};


export function teardown() {
  graph_db.close();
}

export default function () {
  let samples: Array<{object}> = graph_samples(graph_db, 1)

  const url: string = "http://su08:7474/db/neo4j/tx/commit";

  let query_statements: array = [];
  for (let graph_sample of samples) {
    let subject_type: string = graph_sample.subject_type
    let object_type: string = graph_sample.object_type
    let query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})--(\`n1\`:\`${object_type}\` {\`id\`: $object}) RETURN *;`;

    let statement: object = {
      statement : query,
      parameters : {
        subject : graph_sample.subject,
        object : graph_sample.object,
      }
    }
    query_statements.push(statement)
  }

  const payload: string = JSON.stringify({statements: query_statements});

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
