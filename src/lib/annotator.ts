import { curieSamples } from "./sampling.ts";
import { Database } from "k6/x/sql";

const ANNOTATOR_CURIE_TABLE = "annotator_curie";

export function annotatorSingleCurie(samplingDatabase: Database): string {
  const curies: Array<string> = curieSamples(
    samplingDatabase,
    ANNOTATOR_CURIE_TABLE,
    1,
  );
  return curies[0];
}

export function annotatorCurieBatchBody(
  samplingDatabase: Database,
  sampleSize: number,
) {
  let ids: Array<string> = curieSamples(
    samplingDatabase,
    ANNOTATOR_CURIE_TABLE,
    sampleSize,
  );

  let annotatorBody: Object = { ids: ids };
  return JSON.stringify(annotatorBody);
}
