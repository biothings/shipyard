import asyncio
import itertools
import sqlite3

import elasticsearch

import gharvest


def edge_harvester() -> dict:
    def edge_update(database_connection: sqlite3.Connection, data_table: str, elasticsearch_response) -> None:
        sample_edges = []
        for document in elasticsearch_response.body["hits"]["hits"]:
            sample_edges.append(
                {
                    "subject": document["_source"]["subject"],
                    "object": document["_source"]["object"],
                    "predicate": document["_source"]["predicate"],
                }
            )

        edge_upsert_command = f"INSERT OR IGNORE INTO {data_table} VALUES(:subject, :object, :predicate);"
        database_connection.executemany(edge_upsert_command, sample_edges)

    hconfig = gharvest.HarvestConfig(
        database="./harvest/edge_sample.db",
        data_table="edge_sample",
        table_structure="(subject TEXT, object TEXT, predicate TEXT)",
        batch_size=10000,
        sample_size=1000,
        identifier="edge-harvesting",
        elasticsearch_address="http://su12:9200",
        elasticsearch_index="rtx_kg2_edges",
    )

    return {"hconfig": hconfig, "update_callback": edge_update}


async def main():
    harvester_functions = [edge_harvester]

    async with asyncio.TaskGroup() as task_group:
        for harvester in harvester_functions:
            harvester_arguments = harvester()
            coroutine = gharvest.harvest_elasticsearch_fields(**harvester_arguments)
            task_group.create_task(coroutine, name=harvester.__name__)


if __name__ == "__main__":
    asyncio.run(main())
