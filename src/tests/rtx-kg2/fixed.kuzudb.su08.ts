import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { kuzudbFixedQuery } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

import { Database, Connection } from "kuzu";

const graphDB = sql.open(driver, "/src/data/graph_sample.db");
// Import the Kùzu module (ESM)

export function setup() {
  const db: Database = new Database(__ENV["KUZUDB_PATH"], 0, true, true);
  const conn: Connection = new Connection(db);
  return { connection: conn }
}


export const options = {
  scenarios: {
    full_load: {
      executor: 'shared-iterations',
      startTime: '0m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '300s'},
      vus: 5,
      iterations: 25,
      maxDuration: '10m',
    }
  },
};


export function teardown() {
  graphDB.close();
}

export default function (data: Object) {
  kuzudbFixedQuery(graphDB, __ENV.NUM_SAMPLE, data.connection);
}

export function handleSummary(data) {
  return { "/testoutput/fixed.kuzudb.su08.ts.json": JSON.stringify(data) };
}
