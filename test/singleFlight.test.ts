import { describe, expect, it, vi } from 'vitest';
import { createSingleFlight } from '../src/lib/singleFlight';

describe('createSingleFlight', () => {
  it('coalesces concurrent calls with same key', async () => {
    const singleFlight = createSingleFlight<string>();
    const run = vi.fn(async () => {
      await Promise.resolve();
      return 'ok';
    });

    const [a, b] = await Promise.all([singleFlight('rename:1', run), singleFlight('rename:1', run)]);

    expect(a).toBe('ok');
    expect(b).toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs again after previous call settles', async () => {
    const singleFlight = createSingleFlight<number>();
    let count = 0;
    const run = vi.fn(async () => {
      count += 1;
      return count;
    });

    const first = await singleFlight('rename:1', run);
    const second = await singleFlight('rename:1', run);

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
