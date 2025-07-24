import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { esFixedQuery } from '../../lib/graph.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

const graphDB = sql.open(driver, "/src/data/graph_sample.db");


export const options = {
  scenarios: {
    full_load: {
      executor: 'shared-iterations',
      startTime: '0s',
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
      'Content-Type': 'application/x-ndjson',
    },
    timeout: '60s'
  };
  return { params: params }
}

export function teardown() {
  graphDB.close();
}

export default function (data: Object) {
  const index: string = "rtx_kg2_edges";
  const payload: string = esFixedQuery(graphDB, __ENV.NUM_SAMPLE, index);
  const url: string = EnvConfiguration["ES_QUERY_URL"]["su12"]
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function handleSummary(data) {
  return { "/testoutput/fixed.elasticsearch.biothings-es8.ts.json": JSON.stringify(data) };
}
