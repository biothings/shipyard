import { curieSamples } from "./sampling.ts";
import { Database } from "k6/x/sql";

export function nameresQuery(samplingDatabase: Database, sampleSize: number) {
  let preferred_curies: Array<string> = curieSamples(samplingDatabase, sampleSize);

  let nameresBody: Object = {
    preferred_curies: preferred_curies,
  };
  return JSON.stringify(nameresBody);
}
