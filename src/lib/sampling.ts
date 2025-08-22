import {Database, Row} from "k6/x/sql";


export function graphSamples(samplingDatabase: Database, sampleSize: number) {
  const sampleQuery: string = "SELECT * FROM graph_sample WHERE rowid IN (SELECT rowid FROM graph_sample ORDER BY random() LIMIT $1)";
  const samples: Array<Row> = samplingDatabase.query(sampleQuery, sampleSize);
  return samples;
}

export function multihopSamples(samplingDatabase: Database, databaseTable: string, sampleSize: number, depthSize: number) {
  const sampleQuery: string = `SELECT * FROM ${databaseTable} WHERE rowid IN (SELECT rowid FROM ${databaseTable} WHERE depth > ${depthSize} ORDER BY random() LIMIT $1)`;
  const samples: Array<Row> = samplingDatabase.query(sampleQuery, sampleSize);
  return samples;
}

export function curieSamples(samplingDatabase: Database, sampleSize: number) {
  const sampleQuery: string = "SELECT * FROM nodenorm_curie WHERE rowid IN (SELECT rowid FROM nodenorm_curie ORDER BY random() LIMIT $1)";
  const samples: Array<Row> = samplingDatabase.query(sampleQuery, sampleSize);

  let curies: Array<string> = [];
  for (let sample of curies) {
    curies.push(sample["curie"]);
  }
  return curies;
}

export function trafficCuries(samplingDatabase: Database, sampleSize: number) {
  const sampleQuery: string = "SELECT json_array(curies) FROM curie_traffic WHERE rowid in (SELECT rowid FROM curie_traffic ORDER BY random() LIMIT $1)";
  const samples: Array<Row> = samplingDatabase.query(sampleQuery, sampleSize);

  let curies: Array<string> = [];
  for (let sample of samples) {
    curies.push(sample["curies"])
  }
  return curies;
}

export function trafficCurieSizes(samplingDatabase: Database, sampleSize: number) {
  const sampleQuery: string = "SELECT curie_count FROM curie_traffic WHERE rowid in (SELECT rowid FROM curie_traffic ORDER BY random() LIMIT $1)";
  const samples: Array<Row> = samplingDatabase.query(sampleQuery, sampleSize);

  let curieCounts: Array<number> = [];
  for (let sample of samples) {
    curieCounts.push(sample.curie_count)
  }
  return curieCounts;
}
