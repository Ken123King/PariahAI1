const express = require("express")
const router = express.Router()
const PumpFunService = require("../services/pumpfun-service")

// Initialize PumpFun service
const pumpfunService = new PumpFunService(process.env.X_API_KEY)

// Get trending tokens
router.get("/trending", async (req, res) => {
  try {
    const redis = req.app.locals.redis

    // Check if we have cached data
    const cachedTokens = await redis.get("pumpfun:trending")
    if (cachedTokens) {
      return res.json({ success: true, data: JSON.parse(cachedTokens) })
    }

    // Get trending tokens
    const tokens = await pumpfunService.getTrendingTokens()

    // Cache tokens for 15 minutes
    await redis.set("pumpfun:trending", JSON.stringify(tokens), "EX", 900)

    res.json({ success: true, data: tokens })
  } catch (error) {
    console.error("Error getting trending tokens:", error)
    res.status(500).json({ success: false, error: "Failed to get trending tokens" })
  }
})

// Get token info
router.get("/token/:symbol", async (req, res) => {
  const { symbol } = req.params

  try {
    const redis = req.app.locals.redis

    // Check if we have cached data
    const cachedToken = await redis.get(`pumpfun:token:${symbol}`)
    if (cachedToken) {
      return res.json({ success: true, data: JSON.parse(cachedToken) })
    }

    // Get token info
    const token = await pumpfunService.getTokenInfo(symbol)

    // Cache token for 15 minutes
    await redis.set(`pumpfun:token:${symbol}`, JSON.stringify(token), "EX", 900)

    res.json({ success: true, data: token })
  } catch (error) {
    console.error(`Error getting token info for ${symbol}:`, error)
    res.status(500).json({ success: false, error: `Failed to get token info for ${symbol}` })
  }
})

// Detect volume anomalies
router.get("/anomalies", async (req, res) => {
  try {
    const redis = req.app.locals.redis

    // Check if we have cached data
    const cachedAnomalies = await redis.get("pumpfun:anomalies")
    if (cachedAnomalies) {
      return res.json({ success: true, data: JSON.parse(cachedAnomalies) })
    }

    // Detect volume anomalies
    const anomalies = await pumpfunService.detectVolumeAnomalies()

    // Cache anomalies for 30 minutes
    await redis.set("pumpfun:anomalies", JSON.stringify(anomalies), "EX", 1800)

    res.json({ success: true, data: anomalies })
  } catch (error) {
    console.error("Error detecting volume anomalies:", error)
    res.status(500).json({ success: false, error: "Failed to detect volume anomalies" })
  }
})

module.exports = router
