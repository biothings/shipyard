export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      startTime: '0s',
      gracefulStop: '15s',
      env: { NUM_SAMPLE: '1', HTTP_TIMEOUT: '15s'},
      vus: 1,
      iterations: 1,
      maxDuration: '30s',
    },
    quarter_load: {
      executor: 'shared-iterations',
      startTime: '30s',
      gracefulStop: '15s',
      env: { NUM_SAMPLE: '250', HTTP_TIMEOUT: '120s'},
      vus: 20,
      iterations: 100,
      maxDuration: '10m',
    },
    half_load: {
      executor: 'shared-iterations',
      startTime: '11m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '500', HTTP_TIMEOUT: '120s'},
      vus: 15,
      iterations: 50,
      maxDuration: '10m',
    },
    full_load: {
      executor: 'shared-iterations',
      startTime: '22m',
      gracefulStop: '30s',
      env: { NUM_SAMPLE: '1000', HTTP_TIMEOUT: '300s'},
      vus: 5,
      iterations: 25,
      maxDuration: '10m',
    }
  },
};