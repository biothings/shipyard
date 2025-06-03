import sql from "k6/x/sql";


function curie_samples(sampling_database: Database, sample_size: int) {
  const sample_query: string = "SELECT * FROM nodenorm_curie WHERE rowid IN (SELECT rowid FROM nodenorm_curie ORDER BY random() LIMIT $1)";
  const samples: Array<{object}> = sampling_database.query(sample_query, sample_size);

  let curies: array = [];
  for (let sample of samples) {
    curies.push(sample["curie"]);
  }
  return curies;
}


export function redis_nodenorm_query(sampling_database: Database, sample_size: int) {
  let curie_samples: Array<{object}> = curie_samples(sampling_database, sample_size);

  let nodenorm_body: Object = {
    curies: curie_samples,
    conflate: False,
    description: False,
    drug_chemical_conflate: False,
  };
  return JSON.stringify(nodenorm_body);
}


export function elasticsearch_nodenorm_query(sampling_database: Database, sample_size: int) {
  let curie_samples: Array<{object}> = curie_samples(sampling_database, sample_size);

  let elasticsearch_body: Object = {
    ids: curies,
    scopes: ["identifiers.i"],
    fields: ["identifiers", "type"]
  };
  return JSON.stringify(elasticsearch_body);
}
