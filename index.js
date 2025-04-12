require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { Redis } = require("@upstash/redis")
const twitterRoutes = require("./routes/twitter")
const pumpfunRoutes = require("./routes/pumpfun")
const walletRoutes = require("./routes/wallets")

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize Redis client
let redis

// Check if we have the REST API URL and token (preferred for Upstash)
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
} else if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("https://")) {
  const urlParts = process.env.REDIS_URL.split("?token=")
  redis = new Redis({
    url: urlParts[0],
    token: urlParts[1] || "",
  })
} else {
  console.warn("No valid Redis configuration found. Using fallback storage.")
  // Simple in-memory fallback
  const inMemoryStorage = {}
  redis = {
    get: async (key) => inMemoryStorage[key],
    set: async (key, value) => {
      inMemoryStorage[key] = value
      return "OK"
    },
    lpush: async (key, ...values) => {
      if (!inMemoryStorage[key]) inMemoryStorage[key] = []
      inMemoryStorage[key].unshift(...values)
      return inMemoryStorage[key].length
    },
    ltrim: async (key, start, stop) => {
      if (inMemoryStorage[key]) {
        inMemoryStorage[key] = inMemoryStorage[key].slice(start, stop + 1)
      }
      return "OK"
    },
    lrange: async (key, start, stop) => {
      if (!inMemoryStorage[key]) return []
      return inMemoryStorage[key].slice(start, stop + 1)
    },
    zadd: async (key, ...args) => {
      if (!inMemoryStorage[key]) inMemoryStorage[key] = []
      // Simple implementation for zadd
      for (let i = 0; i < args.length; i += 2) {
        const score = args[i]
        const member = args[i + 1]
        inMemoryStorage[key].push({ score, member })
      }
      return args.length / 2
    },
    zrange: async (key, start, stop) => {
      if (!inMemoryStorage[key]) return []
      return inMemoryStorage[key]
        .sort((a, b) => a.score - b.score)
        .slice(start, stop + 1)
        .map((item) => item.member)
    },
    zincrby: async (key, increment, member) => {
      if (!inMemoryStorage[key]) inMemoryStorage[key] = []
      const item = inMemoryStorage[key].find((i) => i.member === member)
      if (item) {
        item.score += increment
        return item.score
      } else {
        inMemoryStorage[key].push({ score: increment, member })
        return increment
      }
    },
    sadd: async (key, ...members) => {
      if (!inMemoryStorage[key]) inMemoryStorage[key] = new Set()
      let added = 0
      for (const member of members) {
        if (!inMemoryStorage[key].has(member)) {
          inMemoryStorage[key].add(member)
          added++
        }
      }
      return added
    },
    srem: async (key, ...members) => {
      if (!inMemoryStorage[key]) return 0
      let removed = 0
      for (const member of members) {
        if (inMemoryStorage[key].has(member)) {
          inMemoryStorage[key].delete(member)
          removed++
        }
      }
      return removed
    },
    smembers: async (key) => {
      if (!inMemoryStorage[key]) return []
      return Array.from(inMemoryStorage[key])
    },
    publish: async (channel, message) => {
      console.log(`Published to ${channel}: ${message}`)
      return 0
    },
  }
}

// Make redis available to routes
app.locals.redis = redis

// Routes
app.use("/api/twitter", twitterRoutes)
app.use("/api/pumpfun", pumpfunRoutes)
app.use("/api/wallets", walletRoutes)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
