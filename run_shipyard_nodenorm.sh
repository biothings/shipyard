#!/usr/bin/env bash

# --- Configuration ---
DURATION="600s"
VUS=1000
HTTP_TIMEOUT="60s"
NUM_SAMPLE=100

# --- Test setup ---
test_name="stress.elasticsearch.biothings-ci.ts"
timestamp=$(date +"%Y%m%d_%H%M")
output_directory="/opt/bt-port/results/nodenorm_test_${timestamp}_vus${VUS}_dur${DURATION}_sample${NUM_SAMPLE}"

mkdir -p "$output_directory"
chmod 777 "$output_directory"

docker compose -f docker-compose.yml run --user root \
  -v "$output_directory":/testoutput \
  -e K6_WEB_DASHBOARD_EXPORT="/testoutput/$test_name.report.html" \
  --rm \
  --entrypoint="k6 run \
    --summary-time-unit=ms \
    --out json=/testoutput/$test_name.jsonlines \
    --out web-dashboard \
    -e ENVIRONMENT='local' \
    -e NUM_SAMPLE=${NUM_SAMPLE} \
    -e HTTP_TIMEOUT=${HTTP_TIMEOUT} \
    --vus ${VUS} \
    --duration ${DURATION} \
    /src/tests/nodenorm/$test_name" \
  shipyard
