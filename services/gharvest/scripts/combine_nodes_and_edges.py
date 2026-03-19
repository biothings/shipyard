import sqlite3


def main():
    edge_db = sqlite3.connect("./edge_sample.db")
    edge_db.row_factory = sqlite3.Row  #   add this row
    edge_cursor = edge_db.cursor()

    node_db = sqlite3.connect("./node_sample.db")
    graph_db = sqlite3.connect("./graph_sample.db")

    table_command = (
        "CREATE TABLE IF NOT EXISTS graph_samples"
        "(subject TEXT, subject_type TEXT, object TEXT, object_type TEXT, predicate TEXT);"
    )
    graph_db.execute(table_command)

    edge_dump = edge_cursor.execute("SELECT * FROM edge_sample;")

    node_dump = node_db.execute("SELECT * FROM node_samples;")
    node_lookup = {entry[0]: entry[1] for entry in node_dump.fetchall()}

    graph_buffer = []
    graph_upsert_command = (
        "INSERT OR IGNORE INTO graph_samples " "VALUES(:subject, :subject_type, :object, :object_type, :predicate);"
    )
    for edge_row in edge_dump:
        subject_type = node_lookup.get(edge_row["subject"], None)
        object_type = node_lookup.get(edge_row["object"], None)

        if subject_type is not None and object_type is not None:
            graph_buffer.append(
                {
                    "subject": edge_row["subject"],
                    "subject_type": subject_type,
                    "object": edge_row["object"],
                    "object_type": object_type,
                    "predicate": edge_row["predicate"],
                }
            )
        if len(graph_buffer) == 1000:
            graph_db.executemany(graph_upsert_command, graph_buffer)
            graph_db.commit()
            graph_buffer = []
            print("COMBINED 1000 rows")

    graph_db.commit()
    graph_db.close()


if __name__ == "__main__":
    main()
