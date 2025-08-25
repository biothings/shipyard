import { curieSamples } from './sampling.ts';
import { Database, Row } from "k6/x/sql";

export function redisNodenormQuery(samplingDatabase: Database, sampleSize: number) {
  let curies: Array<Object> = curieSamples(samplingDatabase, sampleSize);

  let nodenormBody: Object = {
    curies: curies,
    conflate: false,
    description: false,
    drug_chemical_conflate: false,
  };
  return JSON.stringify(nodenormBody);
}


export function elasticsearchNodenormAPIQuery(samplingDatabase: Database, sampleSize: number) {
  let curies: Array<{object}> = curieSamples(samplingDatabase, sampleSize);

  let elasticsearchBody: Object = {
    ids: curies,
    scopes: ["identifiers.i"],
    fields: ["identifiers", "type"],
    size: Number(sampleSize)
  };
  return JSON.stringify(elasticsearchBody);
}


export function elasticsearchNodenormBackendQuery(samplingDatabase: Database, sampleSize: int, es_index: string) {
  let curies: Array<{object}> = curieSamples(samplingDatabase, sampleSize)

  let aggregatedStatements: Array<Object> = [];
  for (let curie_sample of curies) {
    aggregatedStatements.push(JSON.stringify({index: es_index}));
    aggregatedStatements.push(
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
  const payload: string = aggregatedStatements.join("\n") + "\n";
  return payload;
}
