function getThreeDartCheckoutScores(): number[] {
  const singles = Array.from({ length: 20 }, (_, i) => i + 1);
  const doubles = Array.from({ length: 20 }, (_, i) => (i + 1) * 2);
  const trebles = Array.from({ length: 20 }, (_, i) => (i + 1) * 3);

  const allDartScores = [
    ...new Set([0, ...singles, ...doubles, ...trebles, 25, 50]),
  ];
  const finishingDarts = [...doubles, 50];

  const checkoutScores = new Set<number>();

  for (const first of allDartScores) {
    for (const second of allDartScores) {
      for (const finish of finishingDarts) {
        const total = first + second + finish;
        if (total > 1 && total <= 170) {
          checkoutScores.add(total);
        }
      }
    }
  }

  return [...checkoutScores].sort((a, b) => a - b);
}

export const THREE_DART_CHECKOUTS: number[] = getThreeDartCheckoutScores();

export function randomUniqueCheckoutNumbers(min: number, max: number, count = 9): number[] {
  const pool = THREE_DART_CHECKOUTS.filter(
    (score) => score >= min && score <= max,
  );

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const result = pool.slice(0, count);

  while (result.length < count && pool.length > 0) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    result.push(pool[randomIndex]);
  }

  return result;
}
