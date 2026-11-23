/**
 * Reference Paper Strategy: 20-Day Donchian Breakout + 200-Day MA Regime Filter (Cautious 30% Short).
 * Provided for educational and paper-trading infrastructure testing only.
 */
export function computePaperPositions(
  closes: readonly number[],
  window = 20,
  shortSize = 0.3,
  maWindow = 200
): number[] {
  const n = closes.length;
  const exitW = Math.max(5, Math.floor(window / 2));
  const pos = new Array<number>(n).fill(0);
  let state = 0;

  for (let t = window; t < n; t++) {
    let highIn = -Infinity;
    let lowIn = Infinity;
    for (let k = t - window; k < t; k++) {
      if (closes[k] > highIn) highIn = closes[k];
      if (closes[k] < lowIn) lowIn = closes[k];
    }
    let highEx = -Infinity;
    let lowEx = Infinity;
    for (let k = t - exitW; k < t; k++) {
      if (closes[k] > highEx) highEx = closes[k];
      if (closes[k] < lowEx) lowEx = closes[k];
    }

    let bearRegime = false;
    if (t >= maWindow) {
      let sum = 0;
      for (let k = t - maWindow + 1; k <= t; k++) sum += closes[k];
      bearRegime = closes[t] < sum / maWindow;
    }

    if (state === 0) {
      if (closes[t] > highIn) state = 1;
      else if (bearRegime && closes[t] < lowIn) state = -shortSize;
    } else if (state > 0) {
      if (bearRegime && closes[t] < lowIn) state = -shortSize;
      else if (closes[t] < lowEx) state = 0;
    } else {
      if (closes[t] > highIn) state = 1;
      else if (!bearRegime || closes[t] > highEx) state = 0;
    }
    pos[t] = state;
  }
  return pos;
}

export function formatPositionLabel(pos: number): string {
  if (pos > 0.01) return `LONG (${Math.round(pos * 100)}%)`;
  if (pos < -0.01) return `SHORT (${Math.round(Math.abs(pos) * 100)}%)`;
  return "FLAT (0%)";
}
