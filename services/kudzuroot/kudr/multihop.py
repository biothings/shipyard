from multiprocessing import Process
from pathlib import Path
from typing import Union
import itertools
import random
import sqlite3

import kuzu

from kudr.operations import _generate_sample_set


async def search_multihop_queries(
    database_path: Union[str, Path], sample_database: Union[str, Path], sample_size: int = None
) -> dict:
    """
    Search method attempting to find signficant queries within the RTX-KG2 knowledge graph
    """
    print("MULTIHOP-SYNTHESIS")
    if sample_size is None:
        sample_size = 1000

    db = kuzu.Database(database_path, read_only=True)
    conn = kuzu.AsyncConnection(db, max_concurrent_queries=8)

    for index, graph_sample in enumerate(itertools.batched(_generate_sample_set(sample_database, sample_size), 3)):
        mhop_query = (
            "MATCH "
            f"(`n0`:Node {{`category`: \"{graph_sample[0]['subject_type']}\"}})"
            f"-[`e01`:Edge {{`predicate`: \"{graph_sample[0]['predicate']}\"}}]"
            f"-(`n1`:Node {{`category`: \"{graph_sample[0]['object_type']}\"}})"
            ", "
            f"(`n1`:Node {{`category`: \"{graph_sample[1]['subject_type']}\"}})"
            f"-[`e02`:Edge {{`predicate`: \"{graph_sample[1]['predicate']}\"}}]"
            f"-(`n2`:Node {{`category`: \"{graph_sample[1]['object_type']}\"}})"
            ", "
            f"(`n2`:Node {{`category`: \"{graph_sample[2]['subject_type']}\"}})"
            f"-[`e03`:Edge {{`predicate`: \"{graph_sample[2]['predicate']}\"}}]"
            f"-(`n3`:Node {{`id`: \"{graph_sample[2]['object']}\", `category`: \"{graph_sample[2]['object_type']}\"}}) "
            "RETURN *;"
        )
        print(f"Search #{index}")
        response = await conn.execute(mhop_query)
        query_results = response.get_all()
        if len(query_results) > 0:
            formatted_results = {"query": mhop_query, "query_results": query_results}



def two_hop_query_search(database_path: Union[str, Path]) -> dict:
    sqlite3_connection = sqlite3.connect("./search/two-hop.sqlite3")
    table_command = (
        "CREATE TABLE IF NOT EXISTS twohop"
        "(n0 TEXT, n1 TEXT, n2 TEXT, depth INTEGER);"
    )
    sqlite3_connection.execute(table_command)

    db = kuzu.Database(database_path, read_only=True)
    kuzu_connection = kuzu.Connection(db)

    search_query = (
        "MATCH (`n0`:Node {})-[`e01`: Edge {}]->(`n1`: Node {})\n"
        "MATCH (`n1`:Node {})-[`e02`: Edge {}]->(`n2`: Node {})\n"
        "RETURN n0.id, n0.category, "
        "n1.id, n1.category, "
        "n2.id, n2.category\n"
        "LIMIT 100000;"
    )

    response = kuzu_connection.execute(search_query)
    queries = random.sample(response.get_all(), k=10)
    for query in queries:
        multihop_query = (
            f'MATCH (`n0`:Node {{`id`: "{query[0]}"}}) - [`e01`: Edge {{}}] - (`n1`: Node {{`id`: "{query[2]}"}})\n'
            f'MATCH (`n1`:Node {{`id`: "{query[2]}"}}) - [`e02`: Edge {{}}] - (`n2`: Node {{`id`: "{query[4]}"}})\n'
            "RETURN *;"
        )
        multihop_result = kuzu_connection.execute(multihop_query).get_all()
        depth = len(multihop_result)
        if depth > 0:
            sqlite3_connection.execute(
                "INSERT OR IGNORE INTO twohop VALUES(:n0, :n1, :n2, :depth);",
                (
                    {
                        "n0": query[0],
                        "n1": query[2],
                        "n2": query[4],
                        "depth": depth,
                    }
                ),
            )
            sqlite3_connection.commit()


def three_hop_query_search(database_path: Union[str, Path]) -> dict:
    sqlite3_connection = sqlite3.connect("./search/three-hop.sqlite3")
    table_command = (
        "CREATE TABLE IF NOT EXISTS threehop"
        "(n0 TEXT, n1 TEXT, n2 TEXT, n3 TEXT, depth INTEGER);"
    )
    sqlite3_connection.execute(table_command)

    db = kuzu.Database(database_path, read_only=True)
    kuzu_connection = kuzu.Connection(db)

    search_query = (
        "MATCH (`n0`:Node {})-[`e01`: Edge {}]->(`n1`: Node {})\n"
        "MATCH (`n1`:Node {})-[`e02`: Edge {}]->(`n2`: Node {})\n"
        "MATCH (`n2`:Node {})-[`e03`: Edge {}]->(`n3`: Node {})\n"
        "RETURN n0.id, n0.category, "
        "n1.id, n1.category, "
        "n2.id, n2.category, "
        "n3.id, n3.category\n"
        "LIMIT 100000;"
    )

    response = kuzu_connection.execute(search_query)
    queries = random.sample(response.get_all(), k=10)
    for query in queries:
        multihop_query = (
            f'MATCH (`n0`:Node {{`id`: "{query[0]}"}}) - [`e01`: Edge {{}}] - (`n1`: Node {{`id`: "{query[2]}"}})\n'
            f'MATCH (`n1`:Node {{`id`: "{query[2]}"}}) - [`e02`: Edge {{}}] - (`n2`: Node {{`id`: "{query[4]}"}})\n'
            f'MATCH (`n2`:Node {{`id`: "{query[4]}"}}) - [`e03`: Edge {{}}] - (`n3`: Node {{`id`: "{query[6]}"}})\n'
            "RETURN *;"
        )
        multihop_result = kuzu_connection.execute(multihop_query).get_all()
        depth = len(multihop_result)
        if depth > 0:
            sqlite3_connection.execute(
                "INSERT OR IGNORE INTO threehop VALUES(:n0, :n1, :n2, :n3, :depth);",
                (
                    {
                        "n0": query[0],
                        "n1": query[2],
                        "n2": query[4],
                        "n3": query[6],
                        "depth": depth,
                    }
                ),
            )
            sqlite3_connection.commit()


def four_hop_query_search(database_path: Union[str, Path]) -> dict:
    sqlite3_connection = sqlite3.connect("./search/four-hop.sqlite3")
    table_command = (
        "CREATE TABLE IF NOT EXISTS fourhop"
        "(n0 TEXT, n1 TEXT, n2 TEXT, n3 TEXT, n4 TEXT, depth INTEGER);"
    )
    sqlite3_connection.execute(table_command)

    db = kuzu.Database(database_path, read_only=True)
    kuzu_connection = kuzu.Connection(db)

    search_query = (
        "MATCH (`n0`:Node {})-[`e01`: Edge {}]->(`n1`: Node {})\n"
        "MATCH (`n1`:Node {})-[`e02`: Edge {}]->(`n2`: Node {})\n"
        "MATCH (`n2`:Node {})-[`e03`: Edge {}]->(`n3`: Node {})\n"
        "MATCH (`n3`:Node {})-[`e04`: Edge {}]->(`n4`: Node {})\n"
        "RETURN n0.id, n0.category, "
        "n1.id, n1.category, "
        "n2.id, n2.category, "
        "n3.id, n3.category, "
        "n4.id, n4.category\n"
        "LIMIT 100000;"
    )

    response = kuzu_connection.execute(search_query)
    queries = random.sample(response.get_all(), k=10)
    for query in queries:
        multihop_query = (
            f'MATCH (`n0`:Node {{`id`: "{query[0]}"}}) - [`e01`: Edge {{}}] - (`n1`: Node {{`id`: "{query[2]}"}})\n'
            f'MATCH (`n1`:Node {{`id`: "{query[2]}"}}) - [`e02`: Edge {{}}] - (`n2`: Node {{`id`: "{query[4]}"}})\n'
            f'MATCH (`n2`:Node {{`id`: "{query[4]}"}}) - [`e03`: Edge {{}}] - (`n3`: Node {{`id`: "{query[6]}"}})\n'
            f'MATCH (`n3`:Node {{`id`: "{query[6]}"}}) - [`e04`: Edge {{}}] - (`n4`: Node {{`id`: "{query[8]}"}})\n'
            "RETURN *;"
        )
        multihop_result = kuzu_connection.execute(multihop_query).get_all()
        depth = len(multihop_result)
        if depth > 0:
            sqlite3_connection.execute(
                "INSERT OR IGNORE INTO fourhop VALUES(:n0, :n1, :n2, :n3, :n4, :depth);",
                (
                    {
                        "n0": query[0],
                        "n1": query[2],
                        "n2": query[4],
                        "n3": query[6],
                        "n4": query[8],
                        "depth": depth,
                    }
                ),
            )
            sqlite3_connection.commit()


def five_hop_query_search(database_path: Union[str, Path]) -> dict:
    sqlite3_connection = sqlite3.connect("./search/five-hop.sqlite3")
    table_command = (
        "CREATE TABLE IF NOT EXISTS fivehop"
        "(n0 TEXT, n1 TEXT, n2 TEXT, n3 TEXT, n4 TEXT, n5 TEXT, depth INTEGER);"
    )
    sqlite3_connection.execute(table_command)

    db = kuzu.Database(database_path, read_only=True)
    kuzu_connection = kuzu.Connection(db)

    search_query = (
        "MATCH (`n0`:Node {})-[`e01`: Edge {}]->(`n1`: Node {})\n"
        "MATCH (`n1`:Node {})-[`e02`: Edge {}]->(`n2`: Node {})\n"
        "MATCH (`n2`:Node {})-[`e03`: Edge {}]->(`n3`: Node {})\n"
        "MATCH (`n3`:Node {})-[`e04`: Edge {}]->(`n4`: Node {})\n"
        "MATCH (`n4`:Node {})-[`e05`: Edge {}]->(`n5`: Node {})\n"
        "RETURN n0.id, n0.category, "
        "n1.id, n1.category, "
        "n2.id, n2.category, "
        "n3.id, n3.category, "
        "n4.id, n4.category, "
        "n5.id, n5.category\n"
        "LIMIT 100000;"
    )

    response = kuzu_connection.execute(search_query)
    queries = random.sample(response.get_all(), k=10)
    for query in queries:
        multihop_query = (
            f'MATCH (`n0`:Node {{`id`: "{query[0]}"}}) - [`e01`: Edge {{}}] - (`n1`: Node {{`id`: "{query[2]}"}})\n'
            f'MATCH (`n1`:Node {{`id`: "{query[2]}"}}) - [`e02`: Edge {{}}] - (`n2`: Node {{`id`: "{query[4]}"}})\n'
            f'MATCH (`n2`:Node {{`id`: "{query[4]}"}}) - [`e03`: Edge {{}}] - (`n3`: Node {{`id`: "{query[6]}"}})\n'
            f'MATCH (`n3`:Node {{`id`: "{query[6]}"}}) - [`e04`: Edge {{}}] - (`n4`: Node {{`id`: "{query[8]}"}})\n'
            f'MATCH (`n4`:Node {{`id`: "{query[8]}"}}) - [`e05`: Edge {{}}] - (`n5`: Node {{`id`: "{query[10]}"}})\n'
            "RETURN *;"
        )
        multihop_result = kuzu_connection.execute(multihop_query).get_all()
        depth = len(multihop_result)
        if depth > 0:

            sqlite3_connection.execute(
                "INSERT OR IGNORE INTO fivehop VALUES(:n0, :n1, :n2, :n3, :n4, :n5, :depth);",
                (
                    {
                        "n0": query[0],
                        "n1": query[2],
                        "n2": query[4],
                        "n3": query[6],
                        "n4": query[8],
                        "n5": query[10],
                        "depth": depth,
                    }
                ),
            )
            sqlite3_connection.commit()


def search_loop(callback, arguments, identifier):
    count = 0
    while True:
        print(f"{identifier} iteration #{count}")
        callback(arguments)
        count += 1


def main():
    p_twohop = Process(
        target=search_loop, args=(two_hop_query_search, "rtxkg2.kuzu", "two-hop")
    )
    p_threehop = Process(
        target=search_loop, args=(three_hop_query_search, "rtxkg2.kuzu", "three-hop")
    )
    p_fourhop = Process(
        target=search_loop, args=(four_hop_query_search, "rtxkg2.kuzu", "four-hop")
    )
    p_fivehop = Process(
        target=search_loop, args=(five_hop_query_search, "rtxkg2.kuzu", "five-hop")
    )

    p_twohop.start()
    p_threehop.start()
    p_fourhop.start()
    p_fivehop.start()


if __name__ == "__main__":
    main()
