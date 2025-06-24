import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { elasticsearch_nodenorm_backend_query } from '../../lib/curie.ts';
import { EnvConfiguration } from '../../configuration/environment.ts';

const curie_db = sql.open(driver, "/src/data/nodenorm_curie.db");


export const options = {
  scenarios: {
    full_load: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '5s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '20s'},
      vus: 5,
      iterations: 100,
      maxDuration: '1m',
    },
    half_load: {
      executor: 'shared-iterations',
      startTime: '1m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '20s'},
      vus: 5,
      iterations: 100,
      maxDuration: '45s',
    },
  },
};


export function setup() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '60s'
  };
  return { params: params }
}

export function teardown() {
  curie_db.close();
}


export default function (data: Object) {
  const index: string = "nodenorm_20250405_roofpu9f";
  const payload: string = elasticsearch_nodenorm_backend_query(curie_db, __ENV.NUM_SAMPLE, index);
  const url: string = EnvConfiguration["NODENORM_QUERY_URL"]["transltr"]
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}
