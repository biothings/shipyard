import {graph_db} from "./db.ts";

export function graphDbTeardown() {
  graph_db.close();
}