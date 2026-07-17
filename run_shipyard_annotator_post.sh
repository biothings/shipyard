#!/usr/bin/env bash

# --- Configuration ---
DURATION="600s"
VUS=1000
HTTP_TIMEOUT="60s"
NUM_SAMPLE=100
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

# --- Test setup ---
test_name="stress.post.ci.ts"
timestamp=$(date +"%Y%m%d_%H%M")
output_directory="/opt/bt-port/results/annotator_test_${timestamp}_vus${VUS}_dur${DURATION}_sample${NUM_SAMPLE}_backend${QUERY_BACKEND}"

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
    -e QUERY_BACKEND=${QUERY_BACKEND} \
    -e HTTP_TIMEOUT=${HTTP_TIMEOUT} \
    --vus ${VUS} \
    --duration ${DURATION} \
    /src/tests/annotator/$test_name" \
  shipyard
