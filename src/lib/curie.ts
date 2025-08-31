import { curieSamples } from './sampling.ts';
import { Database, Row } from "k6/x/sql";

export function nodenormElasticsearchQuery(samplingDatabase: Database, sampleSize: number) {
  let curies: Array<Object> = curieSamples(samplingDatabase, sampleSize);

  let nodenormBody: Object = {
    curie: curies,
    conflate: false,
    description: false,
    drug_chemical_conflate: false,
  };
  return JSON.stringify(nodenormBody);
}

export function nodenormRedisQuery(samplingDatabase: Database, sampleSize: number) {
  let curies: Array<Object> = curieSamples(samplingDatabase, sampleSize);

  let nodenormBody: Object = {
    curies: curies,
    conflate: false,
    description: false,
    drug_chemical_conflate: false,
  };
  return JSON.stringify(nodenormBody);
}
