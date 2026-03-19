import logging
import sqlite3
import time
from pathlib import Path
from typing import Union

import kuzu

logger = logging.getLogger("kudzuroot")


def _generate_sample_set(graph_sample_database: Union[str, Path], sample_size: int):
    graph_sample_connection = sqlite3.connect(graph_sample_database)
    graph_sample_connection.row_factory = sqlite3.Row

    random_sample_query = (
        "SELECT * FROM graph_sample WHERE rowid IN "
        f"(SELECT rowid FROM graph_sample ORDER BY random() LIMIT {sample_size});"
    )
    return graph_sample_connection.execute(random_sample_query)


def query_floating_object_order1(
    database_path: Union[str, Path], sample_database: Union[str, Path], sample_size: int = None
) -> dict:
    """
    Batch query evaluation against the kuzudb database of RTX-KG2 nodes/edges

    Term structure:
    subject -> fixed id and fixed category
    predicate -> fixed predicate
    object -> floating id and fixed category
    """
    if sample_size is None:
        sample_size = 1000

    db = kuzu.Database(database_path, read_only=True)
    conn = kuzu.Connection(db)

    queries = []
    for graph_sample in _generate_sample_set(sample_database, sample_size):
        floating_query = (
            "MATCH "
            f"(`n0`:Node {{`id`: \"{graph_sample['subject']}\", `category`: \"{graph_sample['subject_type']}\"}})"
            f"-[`e01`:Edge {{`predicate`: \"{graph_sample['predicate']}\"}}]->"
            f"(`n1`:Node {{`category`: \"{graph_sample['object_type']}\"}}) "
            "RETURN *; "
        )
        queries.append(floating_query)

    start_time = time.perf_counter()
    try:
        batch_response = conn.execute("".join(queries))
    except Exception as gen_exc:
        logger.exception(gen_exc)
        return {"wall_time": None, "query_time": None, "compile_time": None}
    else:
        end_time = time.perf_counter()
        return {
            "wall_time": end_time - start_time,
            "query_time": sum((response.get_execution_time() for response in batch_response)),
            "compile_time": sum((response.get_compiling_time() for response in batch_response)),
        }


def query_floating_predicate_order1(
    database_path: Union[str, Path], sample_database: Union[str, Path], sample_size: int = None
):
    """
    Batch query evaluation against the kuzudb database of RTX-KG2 nodes/edges

    Term structure:
    subject -> fixed id and fixed category
    predicate -> floating predicate
    object -> fixed id and fixed category
    """
    if sample_size is None:
        sample_size = 1000

    db = kuzu.Database(database_path, read_only=True)
    conn = kuzu.Connection(db)

    queries = []
    for graph_sample in _generate_sample_set(sample_database, sample_size):
        floating_query = (
            "MATCH "
            f"(`n0`:Node {{`id`: \"{graph_sample['subject']}\", `category`: \"{graph_sample['subject_type']}\"}})"
            "-[`e01`:Edge {}]->"
            f"(`n1`:Node {{`id`: \"{graph_sample['object']}\", `category`: \"{graph_sample['object_type']}\"}}) "
            "RETURN *; "
        )
        queries.append(floating_query)

    start_time = time.perf_counter()
    try:
        batch_response = conn.execute("".join(queries))
    except Exception as gen_exc:
        logger.exception(gen_exc)
        return {"wall_time": None, "query_time": None, "compile_time": None}
    else:
        end_time = time.perf_counter()
        return {
            "wall_time": end_time - start_time,
            "query_time": sum((response.get_execution_time() for response in batch_response)),
            "compile_time": sum((response.get_compiling_time() for response in batch_response)),
        }


def query_floating_subject_order1(
    database_path: Union[str, Path], sample_database: Union[str, Path], sample_size: int = None
) -> dict:
    """
    Batch query evaluation against the kuzudb database of RTX-KG2 nodes/edges

    Term structure:
    subject -> floating id and fixed category
    predicate -> fixed predicate
    object -> fixed id and fixed category
    """
    if sample_size is None:
        sample_size = 1000

    db = kuzu.Database(database_path, read_only=True)
    conn = kuzu.Connection(db)

    queries = []
    for graph_sample in _generate_sample_set(sample_database, sample_size):
        floating_query = (
            "MATCH "
            f"(`n0`:Node {{`category`: \"{graph_sample['subject_type']}\"}})"
            f"-[`e01`:Edge {{`predicate`: \"{graph_sample['predicate']}\"}}]->"
            f"(`n1`:Node {{`id`: \"{graph_sample['object']}\", `category`: \"{graph_sample['object_type']}\"}}) "
            "RETURN *; "
        )
        queries.append(floating_query)

    start_time = time.perf_counter()
    try:
        batch_response = conn.execute("".join(queries))
    except Exception as gen_exc:
        logger.exception(gen_exc)
        return {"wall_time": None, "query_time": None, "compile_time": None}
    else:
        end_time = time.perf_counter()
        return {
            "wall_time": end_time - start_time,
            "query_time": sum((response.get_execution_time() for response in batch_response)),
            "compile_time": sum((response.get_compiling_time() for response in batch_response)),
        }


def query_fixed(database_path: Union[str, Path], sample_database: Union[str, Path], sample_size: int = None) -> dict:
    """
    Batch query evaluation against the kuzudb database of RTX-KG2 nodes/edges

    Term structure:
    subject -> fixed id and fixed category
    predicate -> fixed predicate
    object -> fixed id and fixed category
    """
    if sample_size is None:
        sample_size = 1000

    db = kuzu.Database(database_path, read_only=True)
    conn = kuzu.Connection(db)

    queries = []
    for graph_sample in _generate_sample_set(sample_database, sample_size):
        fixed_query = (
            "MATCH "
            f"(`n0`:Node {{`id`: \"{graph_sample['subject']}\", `category`: \"{graph_sample['subject_type']}\"}})"
            f"-[`e01`:Edge {{`predicate`: \"{graph_sample['predicate']}\"}}]->"
            f"(`n1`:Node {{`id`: \"{graph_sample['object']}\", `category`: \"{graph_sample['object_type']}\"}}) "
            "RETURN *; "
        )
        queries.append(fixed_query)

    start_time = time.perf_counter()
    try:
        batch_response = conn.execute("".join(queries))
    except Exception as gen_exc:
        logger.exception(gen_exc)
        return {"wall_time": None, "query_time": None, "compile_time": None}
    else:
        end_time = time.perf_counter()
        return {
            "wall_time": end_time - start_time,
            "query_time": sum((response.get_execution_time() for response in batch_response)),
            "compile_time": sum((response.get_compiling_time() for response in batch_response)),
        }
