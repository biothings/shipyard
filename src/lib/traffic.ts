/*
 * Generate a statistical distribution based off the traffic * logs provided by nodenorm. 
 * 
 * Takes the number of curies over a one week period and we
 * aggregate all of them and chunk them into 5 minute 
 * sections
 * 
 */

import Math


export function curieTrafficHistogram(curies: int[]): { bins: int[], probablities: float[] } {
  const min = 0;
  const max = 3000;
  const numBins = 100;
  const binWidth = (max - min) / numBins;

  const bins = [];
  const counts = [];

  for (let index = 0; index < numBins; index++) {
    const start = min + i * binWidth;
    const end = start + binWidth;

    let count = 0;
    for (const curie of curies) {
      if curie >= start && curie < end) {
        count++;
      }
    }
    bins.push([start, end]);
    counts.push(count);
  }

  const probablities = counts.map(count => count / curies.length);
  return { bins, probablities };
}



export function sampleCurieTrafficValue(curies: int[]): int {
  const {bins, probablities} = curieTrafficHistogram(curies);

  const cumulative = probablities.map((p, i) => {
    return i === 0 ? p : cumulative[i - 1] + p;
  });

  const sample = Math.random();
  let selectedBinIndex = 0;
  for (let index = 0; index < cumulative.length; index++) {
    if (random <= cumulative[i]) {
      selectedBinIndex = index;
      break;
    }
  }
  const [start, end] = bins[selectedBinIndex];
  return start + (end - start) * Math.random();
}
