/*
 * Generate a statistical distribution based off the traffic * logs provided by nodenorm. 
 * 
 * Takes the number of curies over a one week period and we
 * aggregate all of them and chunk them into 5 minute 
 * sections
 * 
 */
export function curieTrafficHistogram(curies: number[]): { bins: number[][], probabilities: number[] } {
  const minimumCuries = 1;
  const maximumCuries = 3000;
  const numberBins = 10;
  const binWidth = (maximumCuries - minimumCuries) / numberBins;

  let count: number = 0;
  for (const curie of curies) {
    if (minimumCuries <= curie && curie < binWidth) {
      count++;
    }
  }

  const probabilities: number[] = [0, 1];
  // probabilities.push(count / curies.length);
  // probabilities.push(1 - probabilities[0]);
  const bins: number[][] = [[minimumCuries, minimumCuries + binWidth], [maximumCuries / 3, maximumCuries]];
  return { bins, probabilities };
}


export function sampleCurieTrafficValue(curies: number[]): number {
  const {bins, probabilities} = curieTrafficHistogram(curies);

  let cumulative = 0;
  const cumulativeProbabilities: number[] = [];
  for (const prob of probabilities) {
    cumulative += prob;
    cumulativeProbabilities.push(cumulative);
  }

  let histBinIndex = 0;

  const sample = Math.random();
  for (let index = 0; index < cumulativeProbabilities.length; index++) {
    if (sample <= cumulativeProbabilities[index]) {
      histBinIndex = index;
      break;
    }
  }
  const [binStart, binEnd] = bins[histBinIndex];
  const histSample: number = binStart + (binEnd - binStart) * Math.random();
  return Math.round(histSample);
}
