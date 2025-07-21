export function curieTrafficHistogram(curies: number[]): { bins: number[][], probabilities: number[] } {
  const minimumCuries = 1;
  const maximumCuries = 3000;
  const bins: number[][] = [[1, 10], [10, 300]];

  // Hard-coding the bucket distributions based off the kind of queries we want based off some
  // initial analysis of the nodenorm traffic
  //
  // Histogram bin 0: Most common bin. Around 50% of the queries should be within this bin of 1-10
  // curies per query
  // Histogram bin 1: Second most common bin. Around 90% of the queries were less than 300 curies in
  // a query, so this bin of 10-300 should be around 30-40%
  // Histogram bin 2: Least common bin. We're slightly modifying the numbers here given the traffic
  // test is around an hour and we want about a 10% for a spike of greater than 1000 curies. In the
  // actual data around 12% of the curies are greater than 300, but we're massaging this for the
  // test to be more generous to get higher spike based traffic

  const probabilities: number[] = [];
  let cumulative: number = 0;
  for (const bin of bins) { 
    let count: number = 0;
    for (const curie of curies) {
      if (bin[0] <= curie && curie < bin[1]) {
        count++;
      }
    }
    probabilities.push(count / curies.length);
    cumulative += (count / curies.length);
  }

  probabilities.push(1 - cumulative)
  bins.push([maximumCuries / 3, maximumCuries])

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
