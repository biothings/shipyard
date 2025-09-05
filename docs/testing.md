## Testing Pipeline


k6 has some level of customization for running the test suite, but I never found a particularly easy
way of calling it using a library style client. The easiest way to setup a basic pipeline involved some bash scripting and cronjobs
for automating nightly tests. 


###### pipeline

```bash
#!/usr/bin/env bash

set -eux
set -o pipefail

compose_file=<insert path to shipyard docker-compose.yml>

timestamp=$(date +"%Y_%m_%d_%s")
output_directory=<insert desired output path>
mkdir -p "$output_directory"


build_image() {
    compose_file=$1
    docker compose -f "$compose_file" build
}

test_suite() {
    compose_file=$1
    output_directory=$2

    tests=(
      <insert list of test names>
    )
    for test_name in "${rtx_kg2_tests[@]}"; do
        k6_command="k6 run \
           --summary-time-unit=ms \
           --http-debug='full' \
           --summary-mode='full' \
           --out json=/testoutput/$test_name.jsonlines \
           -e ENVIRONMENT='local' \ <- Change this to 'prod' if running on su08
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
test_suite "$compose_file" "$output_directory"
```



