import { createClient, RedisClientType } from 'redis';
import dotenv from "dotenv"
dotenv.config()

let client: RedisClientType | null = null

export const getRedisClient = async () => {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
  }
  return client
}

export async function setValue(key: string, value: string) {
  const client = await getRedisClient();
  await client.set(key, value);
}

export async function getValue(key: string) {
  const client = await getRedisClient();
  return client.get(key);
}

export async function checkRedisHealth() {
  try {
    await setValue('health', 'ok');
    const reply = await getValue('health');
    return reply === 'ok';
  } catch (error) {
    console.error('Redis Health Check Failed:', error);
    return false;
  }
}

