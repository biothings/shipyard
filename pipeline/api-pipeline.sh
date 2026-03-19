#!/usr/bin/env bash

set -eux
set -o pipefail


compose_file=~/workspace/ncats/benchmark/shipyard/docker-compose.yml

timestamp=$(date +"%Y_%m_%d_%s")
output_directory=~/workspace/ncats/benchmark/shipyard/results/"$timestamp"
mkdir -p "$output_directory"


build_image() {
    compose_file=$1
    docker compose -f "$compose_file" build
}

graph_tests() {
    compose_file=$1
    output_directory=$2

    nodenorm_tests=(
        "api.equality.ts"
        "stress.elasticsearch.biothings-ci.ts"
        "stress.redis.renci.ts"
    )
    for test_name in "${nodenorm_tests[@]}"; do
        k6_command="k6 run \
           --summary-time-unit=ms \
           --summary-mode='full' \
           --out json=/testoutput/$test_name.jsonlines \
           -e ENVIRONMENT='local' \
           /src/tests/nodenorm/$test_name"
        docker compose \
           -f "$compose_file" run \
           -v "$output_directory":/testoutput \
           -e K6_WEB_DASHBOARD="true" \
           -e K6_WEB_DASHBOARD_EXPORT="/testoutput/$test_name.report.html" \
           --rm \
           --entrypoint="$k6_command" \
           shipyard
    done
exit 0
}

build_image "$compose_file"

graph_tests "$compose_file" "$output_directory"
