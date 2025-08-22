export const options = {
  scenarios: {
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
