import exec from 'k6/execution';
import http from 'k6/http';
import sql from "k6/x/sql";

import driver from "k6/x/sql/driver/sqlite3";

import { EnvConfiguration } from '../../configuration/environment.ts';
import { elasticsearch_nodenorm_backend_query } from '../../lib/curie.ts';
import { sampleCurieTrafficValue } from '../../lib/traffic.ts';
import { traffic_curie_sizes } from '../../lib/sampling.ts';

const curie_db = sql.open(driver, "/src/data/nodenorm_curie.db");
const traffic_db = sql.open(driver, "/src/data/traffic.db");


export const options = {
  scenarios: {
    traffic_simulation: {
      executor: 'constant-vus',
      vus: 1,
      env: { NUM_SAMPLE: '10', HTTP_TIMEOUT: '300s' },
      startTime: '0s',
      duration: '60m',
    }
  }
};

export function setup() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    chunkInterval: [0.0, 600000.0],
    timeout: '300s'

  };
  return { params: params }
}

export function teardown() {
  curie_db.close();
}


export default function (data) {
  if (exec.instance.currentTestRunDuration > data.params.chunkInterval[1]) {
    const curieSizeSampling = traffic_curie_sizes(traffic_db, -1);
    let trafficValue = sampleCurieTrafficValue(curieSizeSampling);
    if (trafficValue > 1000) {
      trafficValue = 1000;
    }
    __ENV.NUM_SAMPLE = trafficValue;
    console.log('Updated curie traffic throughput to ', trafficValue);
    const intervalDifference: number = data.params.chunkInterval[1] - data.params.chunkInterval[0];
    data.params.chunkInterval[0] += intervalDifference;
    data.params.chunkInterval[1] += intervalDifference;
  }


  const url: string = EnvConfiguration["NODENORM_QUERY_URL"]["su12"];
  const index: string = "nodenorm_20250507_4ibdxry7";
  const payload: string = elasticsearch_nodenorm_backend_query(curie_db, __ENV.NUM_SAMPLE, index);
  data.params.timeout = __ENV.HTTP_TIMEOUT;
  http.post(url, payload, data.params);
}


export function handleSummary(data) {
  return { "/testoutput/traffic.elasticsearch.biothings-es8.ts.json": JSON.stringify(data) };
}
