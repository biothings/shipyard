import asyncio
import logging
import sqlite3

import elasticsearch

import gharvest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger("elasticsearch").setLevel("CRITICAL")

async def curie_harvester(batch_size: int = None):
    """
    Procedure for generating potential valid CURIE identifiers from
    out nodenormalizaion API

    Randomly generates a set of values for the prefix and index (numerical value)
    from a distribution, then polls the API for valid results. We updates a local sqlite3 table
    accordingly based off the sampled CURIE identifier produces a non-null response from
    the API
    """
    if batch_size is None:
        batch_size = 10000000

    main_table = "curie_sampling"

    curie_sample_connection = sqlite3.connect(f"{main_table}.db")
    sample_curie_table_command = "CREATE TABLE IF NOT EXISTS " f"{main_table} (curie TEXT PRIMARY KEY, valid INTEGER);"
    curie_sample_connection.execute(sample_curie_table_command)

    sampling_progress = tqdm(desc="curie sampling", total=batch_size, initial=pointer)

    async with httpx.AsyncClient() as http_client:
        curie_prefix_references = await curie_prefix_reference(http_client)
        num_samples = 500
        for batch_index in range(0, batch_size, 1):
            curie_prefix = random.choices(curie_prefix_references, k=num_samples)

            curie_index = []
            for _ in range(num_samples):
                curie_index.append(sampled_integer())

            curie_identifiers = []
            for prefix, index in zip(curie_prefix, curie_index):
                curie_identifiers.append(f"{prefix}:{index}")

            node_normalization_body = {
                "curies": curie_identifiers,
                "conflate": False,
                "description": False,
                "drug_chemical_conflate": False,
            }

            try:
                response = await http_client.post(
                    "https://nodenormalization-sri.renci.org/1.5/get_normalized_nodes",
                    json=node_normalization_body,
                    timeout=120,
                )

                sample_curies = []
                for curie_identifier, node_response in response.json().items():
                    sample_curies.append({"curie": curie_identifier, "valid": node_response is not None})

                curie_upsert_command = (
                    f"INSERT INTO {main_table} VALUES(:curie, :valid) "
                    "ON CONFLICT(curie) DO UPDATE SET valid=excluded.valid;"
                )
                curie_sample_connection.executemany(curie_upsert_command, sample_curies)

                if batch_index % 500 == 0 and batch_index != 0:
                    curie_sample_connection.commit()
                    sampling_progress.update(batch_index)

            except Exception as gen_exc:
                logger.exception(gen_exc)

        curie_sample_connection.commit()
        curie_sample_connection.close()


def lognorm_sampled_integer() -> int:
    """
    Generates an integer from the log-normal distribution
    """
    mu = 5
    sigma = 2.5
    return int(random.lognormvariate(mu, sigma))


def uniform_sampled_integer(bounds: tuple[int, int] = None) -> int:
    """
    Generates an integer from a uniform distribution
    """
    if bounds is None:
        bounds = (50, 10000000)
    return int(random.uniform(bounds[0], bounds[1]))


async def curie_prefix_reference(http_client: httpx.AsyncClient) -> list[str]:
    """
    HTTP endpoint:
        https://nodenormalization-sri.renci.org/1.5/get_curie_prefixes
    """
    curie_prefix_endpoint = "https://nodenormalization-sri.renci.org/1.5/get_curie_prefixes"
    response = await http_client.get(curie_prefix_endpoint, timeout=None)
    biolink_mapping = response.json()

    prefixes = set()
    for biolink_entry in biolink_mapping.values():
        curie_prefix = biolink_entry["curie_prefix"]
        for prefix in curie_prefix.keys():
            prefixes.add(prefix)
    return list(prefixes)


def nodenorm_curie_harvester() -> dict:
    async def curie_update(
        elasticsearch_client: elasticsearch.AsyncElasticsearch,
        database_connection: sqlite3.Connection,
        data_table: str,
        elasticsearch_response,

    ) -> None:
        sample_curies = []
        for document in elasticsearch_response.body["hits"]["hits"]:
            source = document.get("_source", {})
            identifiers = source.get("identifiers", [])
            for identifier in identifiers:
                sample_curies.append({"curie": identifier["i"]})

        curie_upsert_command = f"INSERT OR IGNORE INTO {data_table} VALUES(:curie);"
        database_connection.executemany(curie_upsert_command, sample_curies)

    hconfig = gharvest.HarvestConfig(
        database="./harvest/nodenorm_curie.db",
        data_table="nodenorm_curie",
        table_structure="(curie TEXT NOT NULL PRIMARY KEY)",
        batch_size=1000,
        sample_size=1000,
        identifier="nodenorm-curie-harvesting",
        elasticsearch_address="http://su10:9200",
        elasticsearch_index="nodenorm_20250507_4ibdxry7",
    )

    return {"hconfig": hconfig, "update_callback": curie_update}


async def main():
    harvester_functions = [nodenorm_curie_harvester]

    async with asyncio.TaskGroup() as task_group:
        for harvester in harvester_functions:
            harvester_arguments = harvester()
            coroutine = gharvest.harvest_elasticsearch_fields(**harvester_arguments)
            task_group.create_task(coroutine, name=harvester.__name__)


if __name__ == "__main__":
    asyncio.run(main())
