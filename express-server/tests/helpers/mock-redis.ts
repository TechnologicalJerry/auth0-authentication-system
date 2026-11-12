import { vi } from 'vitest';

export class InMemoryRedisMock {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    const expiry = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async scan(cursor: string, _match: string, pattern: string): Promise<[string, string[]]> {
    const prefix = pattern.replace('*', '');
    const matchedKeys: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        matchedKeys.push(key);
      }
    }
    return ['0', matchedKeys];
  }

  pipeline() {
    let currentIncr = 1;
    return {
      incr: vi.fn().mockImplementation(() => {
        currentIncr = (currentIncr || 0) + 1;
      }),
      pttl: vi.fn().mockReturnValue(60000),
      exec: vi.fn().mockResolvedValue([
        [null, 1],
        [null, 60000],
      ]),
    };
  }

  clear(): void {
    this.store.clear();
  }
}

export const inMemoryRedisMock = new InMemoryRedisMock();
