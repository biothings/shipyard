import encoding from 'k6/encoding';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

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

    let query: string = `MATCH (\`n0\`:\`${subject_type}\` {\`id\`: $subject})-[\`e01\`:\`${predicate}\`]->(\`n1\`:\`${object_type}\` {\`id\`: $object}) RETURN *;`;

    let statement: object = {
      statement : query,
      parameters : {
        subject : graph_sample.subject,
        object : graph_sample.object,
      }
    }
    statements.push(statement)
  }

  const payload: string = JSON.stringify(statements);

  const USERNAME: string = `${__ENV.NEO4J_USERNAME}`;
  const PASSWORD: string = `${__ENV.NEO4j_PASSWORD}`;
  const credentials = encoding.b64encode(`${USERNAME}:${PASSWORD}`);
  const params = {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
  };
  http.post(url, payload, params);
}
