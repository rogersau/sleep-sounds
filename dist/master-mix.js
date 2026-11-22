// Both native assets contain 1.5x level. Their decoded peaks are <0.80;
// reserve 0.85 per layer plus 2% output margin even if their peaks coincide.
function calculateMasterMix(levels, percent) {
  const weights = levels.map(v => Math.min(100, Math.max(0, Number(v) || 0)) / 100);
  const requested = Math.min(150, Math.max(100, Number(percent) || 100));
  const sum = weights.reduce((a,b)=>a+b,0);
  const gain = Math.min(requested / 150, sum ? 0.98 / (0.85 * sum) : 1);
  return {volumes:weights.map(v=>v*gain),effective:gain*150,limited:gain*150<requested-0.1};
}

if (typeof module !== 'undefined') module.exports = {calculateMasterMix};
