## HTTP Response Size Histogram Generation

In order to roughly compare the HTTP response sizes, we aggregate the `data_received` metric from
the output and generate a distribution to compare the same tests against different backends. 

```python
from typing import Union
import json
import multiprocessing
import multiprocessing.pool
import pathlib

import jsonlines
import numpy
import matplotlib
import matplotlib.pyplot as plt


"""
Reference:
https://stackoverflow.com/questions/6974695/python-process-pool-non-daemonic
"""

matplotlib.use("TkAgg")

test_combinations = {
    "2hop": ["dgraph", "janusgraph"],
    "3hop": ["dgraph", "janusgraph"],
    "4hop": ["dgraph", "janusgraph"],
    "5hop": ["dgraph", "janusgraph"],
    "fixed": ["dgraph", "janusgraph", "ploverdb", "elasticsearch"],
    "floating-object": ["dgraph", "janusgraph", "ploverdb", "elasticsearch"],
    "floating-predicate": ["dgraph", "janusgraph", "ploverdb", "elasticsearch"],
    "floating-subject": ["dgraph", "janusgraph", "ploverdb", "elasticsearch"],
}


class NonDaemonizedProcess(multiprocessing.Process):
    @property
    def daemon(self):
        return False

    @daemon.setter
    def daemon(self, value):
        pass


class NonDaemonizedContext(type(multiprocessing.get_context())):
    Process = NonDaemonizedProcess


# We sub-class multiprocessing.pool.Pool instead of multiprocessing.Pool
# because the latter is only a wrapper function, not a proper class.
class NestablePool(multiprocessing.pool.Pool):
    def __init__(self, *args, **kwargs):
        kwargs["context"] = NonDaemonizedContext()
        super().__init__(*args, **kwargs)


def aggregate_test_http_response_sizes(
    data_path: Union[str, pathlib.Path], test_type: str, backend_type: str
) -> tuple:
    """
    Aggregates all tests of a specific type (2hop) and backend (elasticsearch) and
    analyzes the responses sizes to generate a histogram from the distribution

    The metrics file should contain entries formatted like the following:
    {
        "metric":"data_received",
        "type":"Point",
        "data":{
            "time":"2025-08-31T15:57:04.522432696Z",
            "value":1.233675e+06,
            "tags":{
                "group":"",
                "scenario":"base_api_comparison"
            }
        }
    }
    """
    metrics_files = pathlib.Path(data_path).glob(
        f"**/{test_type}.{backend_type}*.jsonlines"
    )
    print(f"Analyzing all {test_type}-{backend_type} HTTP response sizes")

    response_sizes = []
    for metric_file in metrics_files:
        with jsonlines.open(metric_file) as reader:
            for obj in reader:
                if (
                    obj.get("metric", "") == "data_received"
                    and obj.get("type", "") == "Point"
                ):
                    metric = obj.get("data", None)
                    if metric is not None:
                        data_received = metric.get("value", None)
                        if data_received is not None:
                            if data_received != 0:
                                response_sizes.append(data_received)

    counts, bins = numpy.histogram(response_sizes)
    return counts, bins


def aggregate_all_backend_response_sizes(
    data_path: Union[str, pathlib.Path], test_type: str, backend_types: list[str]
) -> dict:
    backend_histograms = {}
    with multiprocessing.Pool(len(backend_types)) as pool:
        for backend in backend_types:
            backend_histograms[backend] = pool.apply_async(
                aggregate_test_http_response_sizes, (data_path, test_type, backend)
            )

        for backend, result in backend_histograms.items():
            result.wait()
            backend_histograms[backend] = result.get(timeout=1)
    return backend_histograms


def visualize_histograms(histograms: dict) -> None:
    for test, histogram_backends in histograms.items():
        fig, ax = plt.subplots()
        labels = []
        for backend, histogram_results in histogram_backends.items():
            ax.stairs(
                histogram_results[0],
                histogram_results[1],
                fill=True,
                alpha=0.8,
            )
            labels.append(backend)

        ax.set_xlabel("Response Size [bytes]")
        ax.set_ylabel("Count")
        ax.set_xscale("log")
        ax.set_yscale("log")
        fig.suptitle(f"{test} histogram")
        fig.legend(labels)
        plt.grid(True)
        print(f"Generating {test}.histogram")
        plt.savefig(f"{test}.histogram.png", dpi=400)


def main():
    data_directory = "/opt/bt-port/pipeline/data"

    histograms = {}
    with NestablePool(len(test_combinations.keys())) as pool:
        for test_type, backends in test_combinations.items():
            histograms[test_type] = pool.apply_async(
                aggregate_all_backend_response_sizes,
                (data_directory, test_type, backends),
            )

        for test, result in histograms.items():
            result.wait()
            histograms[test] = result.get(timeout=1)
    visualize_histograms(histograms)


if __name__ == "__main__":
    main()
```
