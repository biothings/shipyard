import http from "k6/http";
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { kuzudbThreeHopQuery } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

const threehopDB = sql.open(driver, "/src/data/three-hop.db");
const tableName: string = "threehop";


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

export function setup() {
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: "60s",
  };
  return { params: params };
}


export function teardown() {
  threehopDB.close();
}

export default function (data: Object) {
  const payload: string = kuzudbThreeHopQuery(threehopDB, tableName, __ENV.NUM_SAMPLE, 100);
  const url: string = EnvConfiguration["KUZUDB_QUERY_URL"];
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return { "/testoutput/3hop.kuzudb.su08.ts.json": JSON.stringify(data) };
}
