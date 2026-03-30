export const RONNIE_STYLE_QUOTES = [
  "Everybody wants to be a bodybuilder, but nobody wants to lift these heavy-ass weights.",
  "Light weight, baby.",
  "Ain't nothin' but a peanut.",
  "The real growth starts when the set gets ugly.",
  "Earn your reps. Respect your recovery.",
  "Discipline beats motivation every session.",
  "Strong habits build stronger bodies.",
  "One more clean rep. Then one more.",
];

export function randomQuote(): string {
  return RONNIE_STYLE_QUOTES[Math.floor(Math.random() * RONNIE_STYLE_QUOTES.length)];
}
