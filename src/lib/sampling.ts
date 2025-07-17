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

export function traffic_curies(sampling_database: Database, sample_size: int) {
  const sample_query: string = "SELECT json_array(curies) FROM curie_traffic WHERE rowid in (SELECT rowid FROM curie_traffic ORDER BY random() LIMIT $1)";
  const samples: Array<{object}> = sampling_database.query(sample_query, sample_size);

  let curies: array = [];
  for (let sample of samples) {
    curies.push(sample.curies)
  }
  return curies;
}

export function traffic_curie_sizes(sampling_database: Database, sample_size: int) {
  const sample_query: string = "SELECT curie_count FROM curie_traffic WHERE rowid in (SELECT rowid FROM curie_traffic ORDER BY random() LIMIT $1)";
  const samples: Array<{object}> = sampling_database.query(sample_query, sample_size);

  let curie_counts: array = [];
  for (let sample of samples) {
    curie_counts.push(sample.curie_count)
  }
  return curie_counts;
}
