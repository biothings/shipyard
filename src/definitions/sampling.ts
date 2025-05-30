import sql from "k6/x/sql";


export function graph_samples(sampling_database: Database, sample_size: int) {
  let sample_query: string = "SELECT * FROM graph_samples WHERE rowid IN (SELECT rowid FROM graph_samples ORDER BY random() LIMIT $1)";
  let samples: Array<{object}> = sampling_database.query(sample_query, sample_size);
  return samples;
}
