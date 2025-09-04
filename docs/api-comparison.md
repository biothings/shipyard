## API Comparison

For the `/src/tests/nodenorm/api.equality.ts` test case, in order to extract mismatched results,
the following script was written to generate an output file displaying the differences between the
two endpoints

It makes the following assumptions

* The results from the `api.equality.ts` test appear in a directory below where the script was run
* The directory contains a specific file
    * a jsonl file containing the raw metric data produced from k6 (command-line example: `--out json=/testoutput/$test_name.jsonlines`)

The script recursively finds all jsonl files and aggregates the `different_response_counter` metric
to filter the tags containing the renci and pending.api responses.

```python
import collections
import json
import multiprocessing
import pathlib
import time
from typing import Union

import jsonlines


def analyze_metric_file(metric_file: Union[str, pathlib.Path]) -> dict:
    erroneous_curies = {}
    with jsonlines.open(metric_file) as reader:
        for obj in reader:
            if (
                obj.get("metric", "") == "different_response_counter"
                and obj.get("type", "") == "Point"
            ):
                try:
                    pending_body = json.loads(obj["data"]["tags"]["pending"])
                    renci_body = json.loads(obj["data"]["tags"]["renci"])
                    for (renci_curie, renci_result), (
                        pending_curie,
                        pending_result,
                    ) in zip(renci_body.items(), pending_body.items()):
                        assert renci_curie == pending_curie
                        if renci_result != pending_result:
                            result_diff = {
                                "renci": {renci_curie: renci_result},
                                "pending": {pending_curie: pending_result},
                            }
                            erroneous_curies[renci_curie] = result_diff
                except Exception:
                    print(f"Unable to analyzer file {metric_file}")

    return erroneous_curies


def main():
    erroneous_curies = {}
    metrics_files = list(pathlib.Path(".").rglob("**/*.jsonl"))

    buffer = collections.deque()
    with multiprocessing.Pool(16) as pool:
        for metric_file in metrics_files:
            print(f"Analyzing file {metric_file}")
            result = pool.apply_async(analyze_metric_file, [metric_file])
            buffer.append(result)

            if len(buffer) >= 16:
                while len(buffer) > 0:
                    result = buffer.popleft()
                    result.wait()
                    erroneous_curies.update(result.get())

    with open("erroneous_curies.result", "w", encoding="utf-8") as handle:
        handle.write(json.dumps(erroneous_curies, indent=2))
    print(
        f"Number of mismatch CURIES FROM {len(metrics_files)*50*1000} CURIE batches: {len(erroneous_curies.keys())}"
    )


if __name__ == "__main__":
    main()
```
