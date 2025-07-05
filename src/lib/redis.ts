import Redis from 'ioredis';


console.log('REDIS_PORT:', process.env.REDIS_PORT);
const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,
});

export default redis;
