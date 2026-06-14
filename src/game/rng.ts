let state = ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;

export const setRngState = (nextState: number) => {
  state = (nextState >>> 0) || 1;
};

export const getRngState = () => state >>> 0;

export const newSeed = () => Math.floor(Math.random() * 900000) + 100000;

export const rng = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
