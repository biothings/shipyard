"""
Harvests CURIE identifiers from the dogpark_src MongoDB replica set for use
in load testing the annotator service.

Unlike the other harvesters, this pulls from a MongoDB collection rather than
elasticsearch, so it doesn't use the shared gharvest.harvest_elasticsearch_fields
helper and just talks to mongo directly with pymongo.
"""

import logging
import re
import sqlite3
from pathlib import Path

import pymongo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URI = "mongodb://su09:27017,su11:27017,su02:27017/?replicaSet=rs0biothings"
DATABASE_NAME = "dogpark_src"
COLLECTION_NAME = "tier0_kg_nodes"

DATA_TABLE = "annotator_curie"
DATABASE_PATH = Path("./harvest/annotator_curie.db")

BATCH_COMMIT_SIZE = 5000

# CURIE structure per https://biolink.github.io/biolink-model: <prefix>:<reference>
# with no whitespace and a non-empty prefix / reference on either side of the colon
CURIE_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.\-]*:\S+$")


def is_valid_curie(candidate: str) -> bool:
    return isinstance(candidate, str) and bool(CURIE_PATTERN.match(candidate))


def annotator_curie_harvester() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    database_connection = sqlite3.connect(DATABASE_PATH)
    database_connection.execute(f"CREATE TABLE IF NOT EXISTS {DATA_TABLE} (curie TEXT NOT NULL PRIMARY KEY);")

    mongo_client = pymongo.MongoClient(MONGO_URI)
    try:
        collection = mongo_client[DATABASE_NAME][COLLECTION_NAME]
        cursor = collection.find({}, {"id": 1, "_id": 0})

        curie_upsert_command = f"INSERT OR IGNORE INTO {DATA_TABLE} VALUES(:curie);"

        seen_count = 0
        valid_count = 0
        batch = []

        for document in cursor:
            seen_count += 1
            curie = document.get("id")
            if is_valid_curie(curie):
                valid_count += 1
                batch.append({"curie": curie})

            if len(batch) >= BATCH_COMMIT_SIZE:
                database_connection.executemany(curie_upsert_command, batch)
                database_connection.commit()
                batch.clear()
                logger.info("processed %s documents (%s valid curies so far)", seen_count, valid_count)

        if batch:
            database_connection.executemany(curie_upsert_command, batch)
            database_connection.commit()

        logger.info("finished: %s documents seen, %s valid curies harvested into %s", seen_count, valid_count, DATABASE_PATH)
    finally:
        mongo_client.close()
        database_connection.close()


if __name__ == "__main__":
    annotator_curie_harvester()
