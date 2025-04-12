const express = require("express")
const router = express.Router()
const WalletService = require("../services/wallet-service")

// Initialize Wallet service
const walletService = new WalletService()

// Get wallet data
router.get("/:address", async (req, res) => {
  const { address } = req.params

  try {
    const redis = req.app.locals.redis

    // Check if we have cached data
    const cachedData = await redis.get(`wallet:${address}:data`)
    if (cachedData) {
      return res.json({ success: true, data: JSON.parse(cachedData) })
    }

    // Get wallet info
    const wallet = await walletService.getWalletInfo(address)

    // Check if wallet is tracked
    const isTracked = await redis.sismember("tracked_wallets", address)
    wallet.isTracked = !!isTracked

    // Get transactions
    const transactions = await walletService.getWalletTransactions(address)

    // Get tokens
    const tokens = await walletService.getWalletTokens(address)

    const data = {
      wallet,
      transactions,
      tokens,
    }

    // Cache data for 15 minutes
    await redis.set(`wallet:${address}:data`, JSON.stringify(data), "EX", 900)

    res.json({ success: true, data })
  } catch (error) {
    console.error(`Error getting wallet data for ${address}:`, error)
    res.status(500).json({ success: false, error: `Failed to get wallet data for ${address}` })
  }
})

// Track wallet
router.post("/track", async (req, res) => {
  const { address } = req.body

  if (!address) {
    return res.status(400).json({ success: false, error: "Address is required" })
  }

  try {
    const redis = req.app.locals.redis

    // Track wallet
    await walletService.trackWallet(address, redis)

    res.json({ success: true })
  } catch (error) {
    console.error(`Error tracking wallet ${address}:`, error)
    res.status(500).json({ success: false, error: `Failed to track wallet ${address}` })
  }
})

// Untrack wallet
router.post("/untrack", async (req, res) => {
  const { address } = req.body

  if (!address) {
    return res.status(400).json({ success: false, error: "Address is required" })
  }

  try {
    const redis = req.app.locals.redis

    // Untrack wallet
    await walletService.untrackWallet(address, redis)

    res.json({ success: true })
  } catch (error) {
    console.error(`Error untracking wallet ${address}:`, error)
    res.status(500).json({ success: false, error: `Failed to untrack wallet ${address}` })
  }
})

// Get liquidated wallets
router.get("/liquidated", async (req, res) => {
  try {
    const redis = req.app.locals.redis

    // Check if we have cached data
    const cachedWallets = await redis.get("wallets:liquidated")
    if (cachedWallets) {
      return res.json({ success: true, data: JSON.parse(cachedWallets) })
    }

    // Detect liquidations
    const liquidatedWallets = await walletService.detectLiquidations(redis)

    // Cache data for 30 minutes
    await redis.set("wallets:liquidated", JSON.stringify(liquidatedWallets), "EX", 1800)

    res.json({ success: true, data: liquidatedWallets })
  } catch (error) {
    console.error("Error getting liquidated wallets:", error)
    res.status(500).json({ success: false, error: "Failed to get liquidated wallets" })
  }
})

module.exports = router
