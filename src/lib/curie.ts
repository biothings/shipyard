import { curie_samples } from './sampling.ts';

export function redis_nodenorm_query(sampling_database: Database, sample_size: int) {
  let curies: Array<{object}> = curie_samples(sampling_database, sample_size);

  let nodenorm_body: Object = {
    curies: curies,
    conflate: false,
    description: false,
    drug_chemical_conflate: false,
  };
  return JSON.stringify(nodenorm_body);
}


export function elasticsearch_nodenorm_api_query(sampling_database: Database, sample_size: number) {
  let curies: Array<{object}> = curie_samples(sampling_database, sample_size);

  let elasticsearch_body: Object = {
    ids: curies,
    scopes: ["identifiers.i"],
    fields: ["identifiers", "type"],
    size: Number(sample_size)
  };
  return JSON.stringify(elasticsearch_body);
}


export function elasticsearch_nodenorm_backend_query(sampling_database: Database, sample_size: int, es_index: string) {
  let curies: Array<{object}> = curie_samples(sampling_database, sample_size)

  let aggregated_statements: array = [];
  for (let curie_sample of curies) {
    aggregated_statements.push(JSON.stringify({index: es_index}));
    aggregated_statements.push(
      JSON.stringify(
        {
          query : {
            bool : {
              filter : [
                {term : { 'identifiers.i' : curie_sample }},
              ]
            }
          }
        }
      )
    );
  }
  const payload: string = aggregated_statements.join("\n") + "\n";
  return payload;
}
