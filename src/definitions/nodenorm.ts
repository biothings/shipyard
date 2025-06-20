import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { redis_nodenorm_query, elasticsearch_nodenorm_query } from './curie_sampling.ts';

const curie_db = sql.open(driver, "/src/data/nodenorm_curie.db");


export const options = {
  scenarios: {
    full_load_redis: {
      executor: 'shared-iterations',
      exec: 'nodenorm_redis',
      startTime: '0',
      gracefulStop: '5s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '20s'},
      vus: 5,
      iterations: 100,
      maxDuration: '1m',
    },
    full_load_elasticsearch: {
      executor: 'shared-iterations',
      exec: 'nodenorm_elasticsearch',
      startTime: '1m',
      gracefulStop: '5s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '20s'},
      vus: 5,
      iterations: 100,
      maxDuration: '1m',
    },
    half_load_redis: {
      executor: 'shared-iterations',
      exec: 'nodenorm_redis',
      startTime: '2m',
      gracefulStop: '5s',
      env: { NUM_SAMPLE: '500', HTTP_TIMEOUT: '20s'},
      vus: 5,
      iterations: 100,
      maxDuration: '45s',
    },
    half_load_elasticsearch: {
      executor: 'shared-iterations',
      exec: 'nodenorm_elasticsearch',
      startTime: '2m45s',
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


export function nodenorm_elasticsearch (data: Object) {
  const url: string = "https://biothings.ci.transltr.io/nodenorm/node";
  const payload: string = elasticsearch_nodenorm_query(curie_db, __ENV.NUM_SAMPLE);
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}

export function nodenorm_redis (data: Object) {
  const url: string = "https://nodenorm.ci.transltr.io/1.5/get_normalized_nodes";
  const payload: string = redis_nodenorm_query(curie_db, __ENV.NUM_SAMPLE);
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}
