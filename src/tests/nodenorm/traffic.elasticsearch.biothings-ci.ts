import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { EnvConfiguration } from '../../configuration/environment.ts';
import { elasticsearch_nodenorm_api_query } from '../../lib/curie.ts';
import { sampleCurieTrafficValue } from '../../lib/traffic.ts';
import { traffic_curie_sizes } from '../../lib/sampling.ts';

const curie_db = sql.open(driver, "/src/data/nodenorm_curie.db");
const traffic_db = sql.open(driver, "/src/data/traffic.db");


export const options = {
  scenarios: {
    traffic-simulation: {
      executor: 'ramping-arrival-rate',
      stages: [
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 100 },
      ],
      preAllocatedVUs: 5,
      vus: 1,
      startTime: '0s',
      gracefulStop: '5s',
      env: { NUM_SAMPLE: '20', HTTP_TIMEOUT: '300s'},
      iterations: 100,
      duration: '60m',
    }
  }
};


export function setup() {

  const traffic_curie_sizes = traffic_curie_sizes(traffic_db, -1);

  function updateTrafficInterval(traffic_curie_size: array) {
    let trafficValue = sampleCurieTrafficValue(traffic_curie_sizes);
    __ENV.NUM_SAMPLE = trafficValue;
    console.log('Updated curie traffic throughput to ', trafficValue);
  }

  setInterval(updateTrafficInterval, 300000, traffic_curie_sizes)

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '300s'
  };
  return { params: params }
}

export function teardown() {
  curie_db.close();
}


export default function (data: Object) {
  const url: string = EnvConfiguration["NODENORM_QUERY_URL"]["ci"]
  const payload: string = elasticsearch_nodenorm_api_query(curie_db, __ENV.NUM_SAMPLE);
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}


export function handleSummary(data) {
  return { "/testoutput/traffic.elasticsearch.biothings-ci.ts.json": JSON.stringify(data) };
}
