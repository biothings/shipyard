#!/usr/bin/env bash

# --- Configuration ---
DURATION="600s"
HTTP_TIMEOUT="60s"
WAIT_BETWEEN_RUNS=300  # seconds (5 minutes)
QUERY_BACKEND="es"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --query-backend)
      [[ $# -ge 2 ]] || { echo "Missing value for --query-backend" >&2; exit 2; }
      QUERY_BACKEND="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: $0 [--query-backend es|biothings]" >&2
      exit 2
      ;;
  esac
done

if [[ "$QUERY_BACKEND" != "es" && "$QUERY_BACKEND" != "biothings" ]]; then
  echo "--query-backend must be 'es' or 'biothings'" >&2
  exit 2
fi

VUS_VALUES=(10 50 100 200 300 500)

# --- Test setup ---
test_name="stress.get.ci.ts"

total=${#VUS_VALUES[@]}
run=0

for VUS in "${VUS_VALUES[@]}"; do
  run=$(( run + 1 ))
  timestamp=$(date +"%Y%m%d_%H%M")
  output_directory="/opt/bt-port/results/annotator_test_${timestamp}_vus${VUS}_dur${DURATION}_backend${QUERY_BACKEND}"

  echo ""
  echo "=== Run ${run}/${total}: VUS=${VUS} DURATION=${DURATION} QUERY_BACKEND=${QUERY_BACKEND} ==="
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
      -e QUERY_BACKEND=${QUERY_BACKEND} \
      -e HTTP_TIMEOUT=${HTTP_TIMEOUT} \
      --vus ${VUS} \
      --duration ${DURATION} \
      /src/tests/annotator/$test_name" \
    shipyard

  if [[ $run -lt $total ]]; then
    echo ""
    echo "--- Waiting ${WAIT_BETWEEN_RUNS}s before next run... ---"
    sleep "$WAIT_BETWEEN_RUNS"
  fi
done

echo ""
echo "=== All ${total} runs completed ==="
