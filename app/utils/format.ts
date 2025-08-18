export const fmt = {
  number(n: number, digits = 3) {
    if (Number.isNaN(n)) return "—";
    return n.toFixed(digits);
  },
};
