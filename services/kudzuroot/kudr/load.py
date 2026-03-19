import concurrent.futures
import logging
import math
import statistics
from pathlib import Path
from typing import Callable, Union

from kudr.operations import (
    query_fixed,
    query_floating_object_order1,
    query_floating_predicate_order1,
    query_floating_subject_order1,
)

logger = logging.getLogger("kudzuroot")
logging.basicConfig()


def _execute_batch(virtual_users: int, callback: Callable, callback_arguments: dict) -> list[dict]:
    with concurrent.futures.ProcessPoolExecutor(max_workers=virtual_users) as executor:
        futures = []
        for task in range(virtual_users):
            future = executor.submit(callback, **callback_arguments)
            futures.append(future)

        concurrent.futures.wait(futures)

        query_results = []
        for future in concurrent.futures.as_completed(futures):
            query_results.append(future.result())
        return query_results


def floating_load(
    iterations: int,
    virtual_users: int,
    database_path: Union[str, Path],
    sample_database: Union[str, Path],
    sample_size: int = None,
):
    """
    Multi-user load simulation. Evaluates kuzudb load handling with
    multiple users concurrently attempting to access the database with heavy
    query loads

    Leverages all three order 1 floating type queries
    """
    callback_arguments = {
        "database_path": database_path,
        "sample_database": sample_database,
        "sample_size": sample_size,
    }

    num_batch = int(math.floor(iterations / virtual_users))

    floating_object_results = []
    for batch_index in range(num_batch):
        results = _execute_batch(virtual_users, query_floating_object_order1, callback_arguments)
        floating_object_results.extend(results)

    print("FLOATING OBJECT ORDER 1")
    evaluate_load(iterations, virtual_users, sample_size, floating_object_results)

    floating_predicate_results = []
    for batch_index in range(num_batch):
        results = _execute_batch(virtual_users, query_floating_predicate_order1, callback_arguments)
        floating_predicate_results.extend(results)

    print("FLOATING PREDICATE ORDER 1")
    evaluate_load(iterations, virtual_users, sample_size, floating_predicate_results)

    floating_subject_results = []
    for batch_index in range(num_batch):
        results = _execute_batch(virtual_users, query_floating_subject_order1, callback_arguments)
        floating_subject_results.extend(results)

    print("FLOATING SUBJECT ORDER 1")
    evaluate_load(iterations, virtual_users, sample_size, floating_subject_results)


def fixed_load(
    iterations: int,
    virtual_users: int,
    database_path: Union[str, Path],
    sample_database: Union[str, Path],
    sample_size: int = None,
):
    callback_arguments = {
        "database_path": database_path,
        "sample_database": sample_database,
        "sample_size": sample_size,
    }

    num_batch = int(math.floor(iterations / virtual_users))

    fixed_results = []
    for batch_index in range(num_batch):
        results = _execute_batch(virtual_users, query_fixed, callback_arguments)
        fixed_results.extend(results)

    print("FIXED QUERY")
    evaluate_load(iterations, virtual_users, sample_size, fixed_results)


def evaluate_load(iterations: int, virtual_users: int, sample_size: int, query_results: list[dict]) -> None:
    """
    Display statistics and results about query aggregations
    """
    wall_time = []
    query_time = []
    compilation_time = []

    for result in query_results:
        wall_time.append(result["wall_time"])
        query_time.append(result["query_time"] / 1000)
        compilation_time.append(result["compile_time"] / 1000)

    iterations_duration = (
        "iteration_duration......................................................: "
        f"avg={statistics.fmean(wall_time):.3f}s "
        f"min={min(wall_time):.3f}s "
        f"med={statistics.median(wall_time):.3f}s "
        f"max={max(wall_time):.3f}s "
    )
    query_duration = (
        "query_duration..........................................................: "
        f"avg={statistics.fmean(query_time):.3f}s "
        f"min={min(query_time):.3f}s "
        f"med={statistics.median(query_time):.3f}s "
        f"max={max(query_time):.3f}s "
    )
    compile_duration = (
        "compile_duration........................................................: "
        f"avg={statistics.fmean(compilation_time):.3f}s "
        f"min={min(compilation_time):.3f}s "
        f"med={statistics.median(compilation_time):.3f}s "
        f"max={max(compilation_time):.3f}s "
    )

    iterations_header = "iterations..............................................................: " f"{iterations}"
    vus = "vus.....................................................................: " f"{virtual_users}"

    print(f"EXECUTION\n{iterations_duration}\n{query_duration}\n{compile_duration}\n{iterations_header}\n{vus}")

    table_header = "| average | minimum | median | maximum | batch | iterations | vu |"
    divider = "|---------|---------|--------|---------|-------|------------|----|"
    line = (
        f"{statistics.fmean(wall_time):.3f}s | {min(wall_time):.3f}s | "
        f"{statistics.median(wall_time):.3f}s | {max(wall_time):.3f}s | "
        f"{sample_size} | {iterations} | {virtual_users} |"
    )

    print(f"{table_header}\n{divider}\n{line}\n")
