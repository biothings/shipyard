import asyncio
import sqlite3

import elasticsearch

import gharvest


def graph_harvester() -> dict:
    """
    Combines node and edge harvesting as the two indices
    (rtx_kg2_edges & rtx_kg2_nodes) are separate at the moment, but
    we want to resolve the subject and object type

    We first sample the edges and then use the nodes index to resolve
    the type
    """

    async def graph_update(
        elasticsearch_client: elasticsearch.AsyncElasticsearch,
        database_connection: sqlite3.Connection,
        data_table: str,
        elasticsearch_response,
    ) -> None:
        node_query_terms = set()
        for document in elasticsearch_response.body["hits"]["hits"]:
            node_query_terms.add(document["_source"]["subject"])
            node_query_terms.add(document["_source"]["object"])

        node_resolution_query = {"size": len(node_query_terms), "query": {"terms": {"_id": list(node_query_terms)}}}
        node_resolution_response = await elasticsearch_client.search(index="rtx_kg2_nodes", body=node_resolution_query)

        node_type_mapping = {}
        for node_response in node_resolution_response["hits"]["hits"]:
            if node_response["_source"]["id"] is not None and node_response["_source"]["category"] is not None:
                node_type_mapping[node_response["_source"]["id"]] = node_response["_source"]["category"]

        graph_samples = []
        for document in elasticsearch_response.body["hits"]["hits"]:
            subject_type = node_type_mapping[document["_source"]["subject"]]
            object_type = node_type_mapping[document["_source"]["object"]]

            if object_type is not None and subject_type is not None:
                graph_samples.append(
                    {
                        "subject": document["_source"]["subject"],
                        "subject_type": subject_type,
                        "object": document["_source"]["object"],
                        "object_type": object_type,
                        "predicate": document["_source"]["predicate"],
                    }
                )

        graph_upsert_command = (
            f"INSERT OR IGNORE INTO {data_table} " "VALUES(:subject, :subject_type, :object, :object_type, :predicate);"
        )
        database_connection.executemany(graph_upsert_command, graph_samples)

    hconfig = gharvest.HarvestConfig(
        database="./harvest/graph_sample.db",
        data_table="graph_sample",
        table_structure="(subject TEXT, subject_type TEXT, object TEXT, object_type TEXT, predicate TEXT)",
        batch_size=100,
        sample_size=1000,
        identifier="graph-harvesting",
        elasticsearch_address="http://su12:9200",
        elasticsearch_index="rtx_kg2_edges",
    )

    return {"hconfig": hconfig, "update_callback": graph_update}


async def main():
    harvester_functions = [graph_harvester]

    async with asyncio.TaskGroup() as task_group:
        for harvester in harvester_functions:
            harvester_arguments = harvester()
            coroutine = gharvest.harvest_elasticsearch_fields(**harvester_arguments)
            task_group.create_task(coroutine, name=harvester.__name__)


if __name__ == "__main__":
    asyncio.run(main())
