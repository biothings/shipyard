"""
Entrypoint for kuzudb benchmarking package with the RTX-KG2 dataset
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from kudr.setup import setup_database
from kudr.operations import (
    query_fixed,
    query_floating_subject_order1,
    query_floating_predicate_order1,
    query_floating_object_order1,
)

from kudr.load import fixed_load, floating_load
from kudr.multihop import search_multihop_queries

# Modified from pip/__main__.py


def _command_parsing() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="kudzuroot",
        description="Command-line interface for evaluating the RTX-KG2 dataset with kuzudb as a backend",
    )
    parser.add_argument("-c", "--config", dest="config", action="store", required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-s", "--setup", dest="setup", action=argparse.BooleanOptionalAction)
    group.add_argument("-o", "--operation", dest="operation", action="store", choices=["all", "floating", "fixed"])
    group.add_argument("-l", "--load", dest="load", action="store", choices=["all", "floating", "fixed"])
    group.add_argument("-m", "--multi-hop", dest="multihop", action=argparse.BooleanOptionalAction)

    commands = parser.parse_args()
    return commands


def main():
    command_namespace = _command_parsing()

    with open(command_namespace.config, "r", encoding="utf-8") as config_handle:
        configuration_mapping = json.load(config_handle)

    database_path = Path(configuration_mapping["database"]).resolve().absolute()
    node_file = Path(configuration_mapping["node_file"]).resolve().absolute()
    edge_file = Path(configuration_mapping["edge_file"]).resolve().absolute()
    sample_database = configuration_mapping["sample_database"]
    sample_size = configuration_mapping["sample_size"]
    iterations = int(configuration_mapping["iterations"])
    virtual_users = int(configuration_mapping["virtual_users"])

    if command_namespace.setup is not None:
        setup_database(database_path=database_path, edge_file=edge_file, node_file=node_file)
    elif command_namespace.operation is not None:
        if command_namespace.operation == "all":
            query_fixed(database_path, sample_database)
            query_floating_subject_order1(database_path, sample_database)
            query_floating_predicate_order1(database_path, sample_database)
            query_floating_object_order1(database_path, sample_database)
        elif command_namespace.operation == "floating":
            query_floating_subject_order1(database_path, sample_database)
            query_floating_predicate_order1(database_path, sample_database)
            query_floating_object_order1(database_path, sample_database)
        elif command_namespace.operation == "fixed":
            query_fixed(database_path, sample_database)
    elif command_namespace.load is not None:
        if command_namespace.load == "all":
            fixed_load(iterations, virtual_users, database_path, sample_database, sample_size)
            floating_load(iterations, virtual_users, database_path, sample_database, sample_size)
        if command_namespace.load == "floating":
            floating_load(iterations, virtual_users, database_path, sample_database, sample_size)
        if command_namespace.load == "fixed":
            fixed_load(iterations, virtual_users, database_path, sample_database, sample_size)
    elif command_namespace.multihop is not None:
        asyncio.run(search_multihop_queries(database_path, sample_database, sample_size))


# Remove '' and current working directory from the first entry
# of sys.path, if present to avoid using current directory
# in pip commands check, freeze, install, list and show,
# when invoked as python -m pip <command>
if sys.path[0] in ("", os.getcwd()):
    sys.path.pop(0)

# If we are running from a wheel, add the wheel to sys.path
# This allows the usage python pip-*.whl/pip install pip-*.whl
if __package__ == "":
    # __file__ is pip-*.whl/pip/__main__.py
    # first dirname call strips of '/__main__.py', second strips off '/pip'
    # Resulting path is the name of the wheel itself
    # Add that to sys.path so we can import pip
    path = os.path.dirname(os.path.dirname(__file__))
    sys.path.insert(0, path)

if __name__ == "__main__":
    sys.exit(main())
