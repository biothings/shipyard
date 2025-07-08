import sql from "k6/x/sql";


export function graph_samples(sampling_database: Database, sample_size: int) {
  const sample_query: string = "SELECT * FROM graph_samples WHERE rowid IN (SELECT rowid FROM graph_samples ORDER BY random() LIMIT $1)";
  const samples: Array<{object}> = sampling_database.query(sample_query, sample_size);
  return samples;
}

export function curie_samples(sampling_database: Database, sample_size: int) {
  const sample_query: string = "SELECT * FROM nodenorm_curie WHERE rowid IN (SELECT rowid FROM nodenorm_curie ORDER BY random() LIMIT $1)";
  const samples: Array<{object}> = sampling_database.query(sample_query, sample_size);

  let curies: array = [];
  for (let sample of samples) {
    curies.push(sample["curie"]);
  }
  return curies;
}
