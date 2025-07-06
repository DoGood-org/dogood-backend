import redis from '@/lib/redis';

export const getCache = async <T>(key: string): Promise<T | null> => {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
};

export const setCache = async (
    key: string,
    value: unknown,
    ttlSeconds = 600
): Promise<void> => {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
};

export const deleteCache = async (key: string): Promise<void> => {
    await redis.del(key);
};
