#!/usr/bin/env bash

# --- Configuration ---
DURATION="600s"
HTTP_TIMEOUT="60s"
WAIT_BETWEEN_RUNS=300  # seconds (5 minutes)

VUS_VALUES=(10 50 100 200 300 500)
NUM_SAMPLE_VALUES=(1 10 100 1000)

# --- Test setup ---
test_name="stress.elasticsearch.biothings-ci.ts"

total=$(( ${#VUS_VALUES[@]} * ${#NUM_SAMPLE_VALUES[@]} ))
run=0

for VUS in "${VUS_VALUES[@]}"; do
  for NUM_SAMPLE in "${NUM_SAMPLE_VALUES[@]}"; do
    run=$(( run + 1 ))
    timestamp=$(date +"%Y%m%d_%H%M")
    output_directory="/opt/bt-port/results/nodenorm_test_${timestamp}_vus${VUS}_dur${DURATION}_sample${NUM_SAMPLE}"

    echo ""
    echo "=== Run ${run}/${total}: VUS=${VUS} NUM_SAMPLE=${NUM_SAMPLE} DURATION=${DURATION} ==="
    echo "Output: ${output_directory}"

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

    if [[ $run -lt $total ]]; then
      echo ""
      echo "--- Waiting ${WAIT_BETWEEN_RUNS}s before next run... ---"
      sleep "$WAIT_BETWEEN_RUNS"
    fi
  done
done

echo ""
echo "=== All ${total} runs completed ==="
