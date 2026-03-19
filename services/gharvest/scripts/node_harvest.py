import asyncio
import itertools
import sqlite3

import elasticsearch

import gharvest


def node_type_harvester() -> dict:
    def node_update(database_connection: sqlite3.Connection, data_table: str, elasticsearch_response) -> None:
        sample_categories = []
        for document in elasticsearch_response.body["hits"]["hits"]:
            sample_categories.append(
                {
                    "category": document["_source"]["category"],
                }
            )

        edge_upsert_command = f"INSERT OR IGNORE INTO {data_table} VALUES(:category);"
        database_connection.executemany(edge_upsert_command, sample_categories)

    hconfig = gharvest.HarvestConfig(
        database="./harvest/node_types.db",
        data_table="node_types",
        table_structure="(category TEXT NOT NULL PRIMARY KEY)",
        batch_size=100,
        sample_size=100,
        identifier="node-type-harvesting",
        elasticsearch_address="http://su12:9200",
        elasticsearch_index="rtx_kg2_nodes",
    )

    return {"hconfig": hconfig, "update_callback": node_update}


def node_harvester() -> dict:
    def node_update(database_connection: sqlite3.Connection, data_table: str, elasticsearch_response) -> None:
        sample_nodes = []
        for document in elasticsearch_response.body["hits"]["hits"]:
            sample_nodes.append(
                {
                    "identifier": document["_source"]["id"],
                    "category": document["_source"]["category"],
                }
            )

        edge_upsert_command = f"INSERT OR IGNORE INTO {data_table} VALUES(:identifier, :category);"
        database_connection.executemany(edge_upsert_command, sample_nodes)

    hconfig = gharvest.HarvestConfig(
        database="./harvest/node_sample.db",
        data_table="node_samples",
        table_structure="(identifier TEXT NOT NULL PRIMARY KEY, category TEXT)",
        batch_size=10000,
        sample_size=1000,
        identifier="node-harvesting",
        elasticsearch_address="http://su12:9200",
        elasticsearch_index="rtx_kg2_nodes",
    )

    return {"hconfig": hconfig, "update_callback": node_update}


async def main():
    harvester_functions = [node_type_harvester, node_harvester]

    async with asyncio.TaskGroup() as task_group:
        for harvester in harvester_functions:
            harvester_arguments = harvester()
            coroutine = gharvest.harvest_elasticsearch_fields(**harvester_arguments)
            task_group.create_task(coroutine, name=harvester.__name__)


if __name__ == "__main__":
    asyncio.run(main())
