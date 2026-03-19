"""
Database setup handling for kuzu
"""

import logging
from pathlib import Path
from typing import Union

import kuzu

logger = logging.getLogger("kuzduroot")


def setup_database(
    database_path: Union[str, Path], edge_file: Union[str, Path], node_file: Union[str, Path], force: bool = False
) -> None:
    """
    Setup the kuzudb database locally for query benchmarking with
    the RTX-KG2 knowledge graph dataset
    """

    database_path = Path(database_path).resolve().absolute()
    if database_path.exists() and not force:
        logger.info("kuzudb database already setup @[%s]", database_path)
    else:
        db = kuzu.Database(database_path)
        conn = kuzu.Connection(db)

        node_file = Path(node_file).resolve().absolute()
        edge_file = Path(edge_file).resolve().absolute()

        logger.info(
            "%s\n%s",
            conn.execute("INSTALL json").get_as_df(),
            conn.execute("LOAD EXTENSION json;").get_as_df(),
        )

        logger.info("Creating Node Table")
        conn.execute("""
            CREATE NODE TABLE Node(
            `id` STRING,
            `name` STRING,
            `category` STRING,
            `all_names` STRING[],
            `all_categories` STRING[],
            `iri` STRING,
            `equivalent_curies` STRING[],
            `description` STRING,
            `publications` STRING[],
            PRIMARY KEY (`id`)
        )
        """)
        logger.info("Starting node copy operation ...")
        conn.execute(f"COPY Node FROM '{node_file}'")
        logger.info("Completed node copy operation")

        logger.info("Creating Node Table")
        conn.execute("""
            CREATE REL TABLE Edge(
            FROM Node TO Node,
            `predicate` STRING,
            `primary_knowledge_source` STRING,
            `kg2_ids` STRING[],
            `domain_range_exclusion` BOOLEAN,
            `knowledge_level` STRING,
            `agent_type` STRING,
            `id` INT,
            `qualified_predicate` STRING,
            `qualified_object_aspect` STRING,
            `qualified_object_direction` STRING,
            `publications` STRING[],
            `publications_info` STRING
        )
        """)

        logger.info("Starting edge copy operation ...")
        conn.execute(f"COPY Edge FROM '{edge_file}'")
        logger.info("Completed edge copy operation")
