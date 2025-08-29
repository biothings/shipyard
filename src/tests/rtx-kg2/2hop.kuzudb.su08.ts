import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { kuzudbTwoHopQuery } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

import { Database, Connection } from "kuzu";

const twohopDB = sql.open(driver, "/src/data/two-hop.db");
const tableName: string = "twohop";

export function setup() {
  const db: Database = new Database("/src/data/rtxkg2.kuzu", 0, true, true);
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
  twohopDB.close();
}

export default function (data: Object) {
  kuzudbTwoHopQuery(twohopDB, tableName, __ENV.NUM_SAMPLE, 50, data.connection);
}

export function handleSummary(data) {
  return { "/testoutput/2hop.kuzudb.su08.ts.json": JSON.stringify(data) };
}
