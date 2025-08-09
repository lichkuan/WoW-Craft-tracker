import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function getRedis() {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set");
  client = createClient({ url });
  client.on("error", (err) => console.error("Redis error:", err));
  await client.connect();
  return client;
}

