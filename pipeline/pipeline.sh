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

    rtx_kg2_tests=(
       "fixed.dgraph.su08.ts"
       "floating-object.dgraph.su08.ts"
       "floating-predicate.dgraph.su08.ts"
       "floating-subject.dgraph.su08.ts"
       "2hop.dgraph.su08.ts"
       "3hop.dgraph.su08.ts"
       "4hop.dgraph.su08.ts"
       "5hop.dgraph.su08.ts"
       "fixed.elasticsearch.biothings-es8.ts"
       "fixed.ploverdb.transltr.ts"
       "floating-object.ploverdb.transltr.ts"
       "floating-predicate.ploverdb.transltr.ts"
       "floating-subject.ploverdb.transltr.ts"
       "floating-subject.elasticsearch.biothings-es8.ts"
       "fixed.kuzudb.su08.ts"
       "2hop.kuzudb.su08.ts"
       "3hop.kuzudb.su08.ts"
       "4hop.kuzudb.su08.ts"
       "5hop.kuzudb.su08.ts"
       "floating-object.kuzudb.su08.ts"
       "floating-subject.kuzudb.su08.ts"
       "floating-predicate.kuzudb.su08.ts"
    )
    for test_name in "${rtx_kg2_tests[@]}"; do
        k6_command="k6 run \
           --summary-time-unit=ms \
           --http-debug='full' \
           --summary-mode='full' \
           --out json=/testoutput/$test_name.jsonlines \
           -e ENVIRONMENT='local' \
           -e NUM_SAMPLE=10 \
           /src/tests/rtx-kg2/$test_name"
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
