import * as sql from "k6/x/sql";
import driver from "k6/x/sql/driver/sqlite3";

export const graph_db = sql.open(driver, "/src/data/graph_sample.db");