export function createSingleFlight<T>() {
  const inFlight = new Map<string, Promise<T>>();

  return (key: string, run: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const next = run().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, next);
    return next;
  };
}
