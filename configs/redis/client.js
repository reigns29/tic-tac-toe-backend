import { createClient } from "redis"

const redisClient = createClient({
  url: process.env.REDIS_URI,
})

redisClient.on("error", (err) => {
  console.error("Error in RedisDB Connection!")
  console.error(err.name, err.message)
  process.exit(1)
})

redisClient.on("ready", () => {
  console.log("RedisDB connection successful!")
})

await redisClient.connect()

export default redisClient
