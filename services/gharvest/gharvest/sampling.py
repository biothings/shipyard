"""
Harvest elastisearch data for local storage and load testing

Random function_score example query:
{
  "size": 1000,
  "query": {
    "function_score": {
      "functions": [
        {
          "random_score": {}
        }
      ]
    }
  }
}
"""

import dataclasses
import logging
import sqlite3
from pathlib import Path
from typing import Callable, Union


import elasticsearch
from tqdm.asyncio import tqdm


logging.getLogger("elasticsearch").setLevel(logging.WARNING)


@dataclasses.dataclass
class HarvestConfig:
    database: Union[str, Path]
    data_table: str
    table_structure: str

    identifier: str
    batch_size: int
    sample_size: int

    elasticsearch_address: str
    elasticsearch_index: str


def _generate_database_tables(hconfig: HarvestConfig) -> sqlite3.Connection:
    """
    Generates a database with a corresponding data table for storage of
    harvested elasticsearch terms
    """
    database_connection = sqlite3.connect(hconfig.database)
    table_command = f"CREATE TABLE IF NOT EXISTS {hconfig.data_table} {hconfig.table_structure};"
    database_connection.execute(table_command)
    return database_connection


async def harvest_elasticsearch_fields(hconfig: HarvestConfig, update_callback: Callable):
    """
    Harvests elasticsearch fields from an index and stores them
    for usage in a local database
    """

    try:
        database_connection = _generate_database_tables(hconfig)
        client = elasticsearch.AsyncElasticsearch(hconfig.elasticsearch_address)
        random_score_query = {
            "size": hconfig.sample_size,
            "query": {"function_score": {"functions": [{"random_score": {}}]}},
        }

        iterator = tqdm(
            range(0, hconfig.batch_size, 1),
            desc=hconfig.identifier,
            total=hconfig.batch_size,
            initial=0,
            colour="GREEN",
        )

        for batch_index in iterator:
            response = await client.search(index=hconfig.elasticsearch_index, body=random_score_query)

            await update_callback(client, database_connection, hconfig.data_table, response)

            if batch_index % 500 == 0 and batch_index != 0:
                database_connection.commit()
    except Exception as gen_exc:
        raise gen_exc
    finally:
        database_connection.commit()
        database_connection.close()

        await client.close()
