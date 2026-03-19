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



##### webserver

This webserver would aggregate the results from the pipeline script and then create some basic HTML
files for displaying the results 

```python
"""
Basic web server for hosting the data collected
from database benchmarking
"""

import collections
import http.server
import json
import operator
import pathlib
import socketserver

SERVER_DIRECTORY = pathlib.Path(__file__).parent.resolve().absolute()
DATA_DIRECTORY = SERVER_DIRECTORY.parent.joinpath("data")


API_TESTS = [
    "stress.elasticsearch.biothings-ci.ts",
    "stress.redis.renci.ts",
    "stress.redis.renci.ci.ts",
    "traffic.elasticsearch.biothings-ci.ts",
    "traffic.redis.renci.ts",
]

BENCHMARK_TESTS = [
    "2hop.dgraph.su08.ts",
    "2hop.janusgraph.su08.ts",
    "2hop.kuzudb.su08.ts",
    "3hop.dgraph.su08.ts",
    "3hop.janusgraph.su08.ts",
    "3hop.kuzudb.su08.ts",
    "4hop.dgraph.su08.ts",
    "4hop.janusgraph.su08.ts",
    "4hop.kuzudb.su08.ts",
    "5hop.dgraph.su08.ts",
    "5hop.janusgraph.su08.ts",
    "5hop.kuzudb.su08.ts",
    "fixed.dgraph.su08.ts",
    "fixed.elasticsearch.adjacency-list.biothings-es8.ts",
    "fixed.elasticsearch.biothings-es8.ts",
    "fixed.janusgraph.su08.ts",
    "fixed.kuzudb.su08.ts",
    "fixed.neo4j.su08.ts",
    "fixed.ploverdb.transltr.ts",
    "floating-object.dgraph.su08.ts",
    "floating-object.elasticsearch.adjacency-list.biothings-es8.ts",
    "floating-object.elasticsearch.biothings-es8.ts",
    "floating-object.janusgraph.su08.ts",
    "floating-object.kuzudb.su08.ts",
    "floating-object.neo4j.su08.ts",
    "floating-object.ploverdb.transltr.ts",
    "floating-predicate.dgraph.su08.ts",
    "floating-predicate.elasticsearch.adjacency-list.biothings-es8.ts",
    "floating-predicate.elasticsearch.biothings-es8.ts",
    "floating-predicate.janusgraph.su08.ts",
    "floating-predicate.kuzudb.su08.ts",
    "floating-predicate.neo4j.su08.ts",
    "floating-predicate.ploverdb.transltr.ts",
    "floating-subject.dgraph.su08.ts",
    "floating-subject.elasticsearch.adjacency-list.biothings-es8.ts",
    "floating-subject.elasticsearch.biothings-es8.ts",
    "floating-subject.janusgraph.su08.ts",
    "floating-subject.kuzudb.su08.ts",
    "floating-subject.neo4j.su08.ts",
    "floating-subject.ploverdb.transltr.ts",
]


def build_html_header() -> list[str]:
    header = []
    header.append("\t<head>\n")
    header.append('\t\t<meta charset="utf-8">\n')
    header.append('\t\t<meta name="viewport" content="width=device-width">\n')
    header.append("\t\t<title>Database Benchmarking</title>\n")
    header.append('\t\t<link href="style.css" rel="stylesheet" type="text/css">\n')
    header.append("\t</head>\n")
    return header


def parse_results() -> tuple[list, tuple[str]]:
    headers = [
        "&nbsp;",
        "HTTP_REQ [p(95)]",
        "HTTP_REQ [avg]",
        "HTTP_REQ [min]",
        "HTTP_REQ [med]",
        "HTTP_REQ [max]",
        "HTTP_REQ [p(90)]",
        "HTTP_RESP [size]",
    ]
    benchmark_results = collections.defaultdict(list)
    for _, dirs, _ in DATA_DIRECTORY.walk(on_error=print):
        for benchmark_directory in dirs:
            inner_directory = DATA_DIRECTORY.joinpath(benchmark_directory)
            for _, _, files in inner_directory.walk(on_error=print):
                for summary_file in files:
                    if pathlib.Path(summary_file).suffix == ".json":
                        print(
                            f"processing summary file {inner_directory} -> {summary_file}"
                        )
                        with open(
                            inner_directory.joinpath(summary_file),
                            "r",
                            encoding="utf-8",
                        ) as summary_handle:
                            try:
                                summary_result = json.load(summary_handle)
                                num_http_req = summary_result["metrics"]["http_reqs"][
                                    "values"
                                ]["count"]
                                data_received = (
                                    summary_result["metrics"]["data_received"][
                                        "values"
                                    ]["count"]
                                    / 1000000
                                )
                                http_req = summary_result["metrics"][
                                    "http_req_duration"
                                ]
                                benchmark_results[summary_file].append(
                                    (
                                        (http_req["values"]["p(95)"], "ms"),
                                        (http_req["values"]["avg"], "ms"),
                                        (http_req["values"]["min"], "ms"),
                                        (http_req["values"]["med"], "ms"),
                                        (http_req["values"]["max"], "ms"),
                                        (http_req["values"]["p(90)"], "ms"),
                                        (data_received / num_http_req, "MB"),
                                    )
                                )
                            except Exception as gen_exc:
                                print(gen_exc)
                                print(
                                    f"failed processing summary file {inner_directory} -> {summary_file}"
                                )

    return benchmark_results, headers


def build_html_body() -> list[str]:
    aggregated_results, headers = parse_results()

    html_table = []
    html_table.append("\t<body>\n")
    html_table.append("\t\t<h1><Database Benchmarking></h1>\n")

    for test_type, test_results in aggregated_results.items():
        html_table.append("\t\t<table>\n")

        # headers
        html_table.append("\t\t\t<tr>\n")
        for header in headers:
            html_table.append(f"\t\t\t\t<td>{header}</td>\n")
        html_table.append("\t\t\t</tr>\n")

        for result in test_results:
            html_table.append("\t\t\t<tr>\n")
            test = pathlib.Path(pathlib.Path(test_type).stem).stem
            html_table.append(f"\t\t\t\t<td>{test}</td>\n")
            for metric in result:
                html_table.append(f"\t\t\t\t<td>{metric[0]:10.4f} {metric[1]}</td>\n")
            html_table.append("\t\t\t</tr>\n")

        html_table.append("\t\t</table>\n")
    html_table.append("\t</body>\n")
    return html_table


def build_html_summary_body() -> list[str]:
    aggregated_results, headers = parse_results()

    html_table = []
    html_table.append("\t<body>\n")
    html_table.append("\t\t<h1><Database Benchmarking Averages></h1>\n")

    # API test headers
    html_table.append("\t\t<table>\n")
    html_table.append("\t\t\t<tr>\n")
    headers[0] = "API (Avg)"
    for header in headers:
        html_table.append(f"\t\t\t\t<td>{header}</td>\n")
    html_table.append("\t\t\t</tr>\n")

    for test_type, test_results in aggregated_results.items():
        if pathlib.Path(test_type).stem in API_TESTS:
            html_table.append("\t\t\t<tr>\n")
            test = pathlib.Path(pathlib.Path(test_type).stem).stem
            html_table.append(f"\t\t\t\t<td>{test}</td>\n")
            units = list(map(operator.itemgetter(1), test_results[0]))
            aggregation_average = [
                sum(map(operator.itemgetter(0), entry)) / len(entry)
                for entry in zip(*test_results)
            ]
            for metric, unit in zip(aggregation_average, units):
                html_table.append(f"\t\t\t\t<td>{metric:10.4f} {unit}</td>\n")
            html_table.append("\t\t\t</tr>\n")
    html_table.append("\t\t</table>\n")

    # Load test headers
    html_table.append("\t\t<table>\n")
    html_table.append("\t\t\t<tr>\n")
    headers[0] = "Load (Avg)"
    for header in headers:
        html_table.append(f"\t\t\t\t<td>{header}</td>\n")
    html_table.append("\t\t\t</tr>\n")
    # for test_type, test_results in aggregated_results.items():

    for benchmark_test in BENCHMARK_TESTS:
        test_results = aggregated_results.get(f"{benchmark_test}.json", None)
        if test_results is not None:
            html_table.append("\t\t\t<tr>\n")
            # test = pathlib.Path(pathlib.Path(test_type).stem).stem
            html_table.append(f"\t\t\t\t<td>{benchmark_test}</td>\n")
            aggregation_average = [
                sum(map(operator.itemgetter(0), entry)) / len(entry)
                for entry in zip(*test_results)
            ]
            units = list(map(operator.itemgetter(1), test_results[0]))
            for metric, unit in zip(aggregation_average, units):
                html_table.append(f"\t\t\t\t<td>{metric:10.4f} {unit}</td>\n")
            html_table.append("\t\t\t</tr>\n")

    html_table.append("\t\t</table>\n")
    html_table.append("\t</body>\n")
    return html_table


def build_html_file() -> str:
    """
    Generates an HTML file aggregating all the results by test type into a table
    """
    html_file = []
    html_file.append("<!DOCTYPE html>\n")
    html_file.append('<html lang="en-US">\n')
    html_file.extend(build_html_header())
    html_file.extend(build_html_body())
    html_file.append("</html>\n")

    filename = "aggregation.html"
    with open(
        SERVER_DIRECTORY.joinpath(filename), "w", encoding="utf-8"
    ) as html_handle:
        html_handle.writelines(html_file)
    return filename


def build_html_summary_file() -> str:
    """
    Generates an HTML file summarizing the aggregated results
    """
    html_file = []
    html_file.append("<!DOCTYPE html>\n")
    html_file.append('<html lang="en-US">\n')
    html_file.extend(build_html_header())
    html_file.extend(build_html_summary_body())
    html_file.append("</html>\n")

    filename = "summary.html"
    with open(
        SERVER_DIRECTORY.joinpath(filename), "w", encoding="utf-8"
    ) as html_handle:
        html_handle.writelines(html_file)
    return filename


class BenchmarkingHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.path = "aggregation.html"
        if self.path == "/summary":
            self.path = "summary.html"
        return http.server.SimpleHTTPRequestHandler.do_GET(self)


def main():
    aggregation_file = build_html_file()
    summary_file = build_html_summary_file()

    PORT = 3400
    with socketserver.TCPServer(("", PORT), BenchmarkingHandler) as httpd:
        print(f"serving database benchmarking -> su08:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            httpd.server_close()


if __name__ == "__main__":
    main()
```

##### style.css


```
html {
  font-family: sans-serif;
}

table {
  border-collapse: collapse;
  border: 2px solid rgb(200,200,200);
  letter-spacing: 1px;
  font-size: 0.8rem;
  table-layout: fixed;
  width: 1800px;
}

td, th {
  border: 1px solid rgb(190,190,190);
  padding: 10px 20px;
}

th {
  background-color: rgb(235,235,235);
}

td {
  text-align: center;
}

tr:nth-child(even) td {
  background-color: rgb(250,250,250);
}

tr:nth-child(odd) td {
  background-color: rgb(245,245,245);
}

caption {
  padding: 10px;
}
```
