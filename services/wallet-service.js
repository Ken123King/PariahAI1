const axios = require("axios")

class WalletService {
  constructor() {
    this.baseUrl = "https://public-api.solscan.io"
  }

  async getWalletInfo(address) {
    try {
      const response = await axios.get(`${this.baseUrl}/account/${address}`)

      return {
        address,
        balance: response.data.lamports / 1000000000, // Convert lamports to SOL
        lastActive: new Date().toISOString(),
        riskScore: this._calculateRiskScore(response.data),
        isTracked: false,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error(`Error getting wallet info for ${address}:`, error)
      throw new Error(`Failed to get wallet info for ${address}`)
    }
  }

  async getWalletTransactions(address, limit = 10) {
    try {
      const response = await axios.get(`${this.baseUrl}/account/transactions`, {
        params: {
          account: address,
          limit,
        },
      })

      return response.data.map((tx) => ({
        signature: tx.txHash,
        blockTime: tx.blockTime,
        slot: tx.slot,
        fee: tx.fee / 1000000000, // Convert lamports to SOL
        status: tx.status === "Success" ? "success" : "failed",
        type: this._determineTransactionType(tx),
        tokenAmount: tx.tokenAmount,
        tokenSymbol: tx.tokenSymbol,
        usdValue: tx.usdValue,
        counterparty: tx.counterparty || null,
        programId: tx.programId,
      }))
    } catch (error) {
      console.error(`Error getting transactions for ${address}:`, error)
      throw new Error(`Failed to get transactions for ${address}`)
    }
  }

  async getWalletTokens(address) {
    try {
      const response = await axios.get(`${this.baseUrl}/account/tokens`, {
        params: {
          account: address,
        },
      })

      return response.data.map((token) => ({
        mint: token.tokenAddress,
        symbol: token.tokenSymbol || "Unknown",
        name: token.tokenName || "Unknown Token",
        amount: token.tokenAmount.uiAmount,
        usdValue: token.tokenAmount.uiAmount * (token.priceUsdt || 0),
        priceChange24h: token.priceChange24h || 0,
      }))
    } catch (error) {
      console.error(`Error getting tokens for ${address}:`, error)
      throw new Error(`Failed to get tokens for ${address}`)
    }
  }

  async detectLiquidations(redis) {
    try {
      // Get tracked wallets from Redis
      const trackedWallets = await redis.smembers("tracked_wallets")
      const liquidatedWallets = []

      for (const address of trackedWallets) {
        // Get previous balance from Redis
        const prevBalanceStr = await redis.get(`wallet:${address}:balance`)
        if (!prevBalanceStr) continue

        const prevBalance = Number.parseFloat(prevBalanceStr)

        // Get current balance
        const walletInfo = await this.getWalletInfo(address)

        // Check if wallet has been liquidated (significant balance drop)
        if (walletInfo.balance < prevBalance * 0.1) {
          const lossPercentage = ((prevBalance - walletInfo.balance) / prevBalance) * 100

          liquidatedWallets.push({
            address,
            liquidationDate: new Date().toISOString(),
            assetsLost: prevBalance - walletInfo.balance,
            lossPercentage,
            lastActive: walletInfo.lastActive,
            status: lossPercentage > 95 ? "Critical" : "At Risk",
          })

          // Update balance in Redis
          await redis.set(`wallet:${address}:balance`, walletInfo.balance.toString())
        }
      }

      return liquidatedWallets
    } catch (error) {
      console.error("Error detecting liquidations:", error)
      throw new Error("Failed to detect liquidations")
    }
  }

  async trackWallet(address, redis) {
    try {
      // Get wallet info
      const walletInfo = await this.getWalletInfo(address)

      // Add to tracked wallets set
      await redis.sadd("tracked_wallets", address)

      // Store wallet balance
      await redis.set(`wallet:${address}:balance`, walletInfo.balance.toString())

      return { success: true }
    } catch (error) {
      console.error(`Error tracking wallet ${address}:`, error)
      throw new Error(`Failed to track wallet ${address}`)
    }
  }

  async untrackWallet(address, redis) {
    try {
      // Remove from tracked wallets set
      await redis.srem("tracked_wallets", address)

      // Remove wallet data
      await redis.del(`wallet:${address}:balance`)

      return { success: true }
    } catch (error) {
      console.error(`Error untracking wallet ${address}:`, error)
      throw new Error(`Failed to untrack wallet ${address}`)
    }
  }

  _calculateRiskScore(walletData) {
    // This is a simplified risk score calculation
    // In a real implementation, this would consider many factors

    // Random score between 30 and 90 for demo purposes
    return Math.floor(Math.random() * 60) + 30
  }

  _determineTransactionType(tx) {
    // Simplified transaction type determination
    if (tx.tokenSymbol) return "swap"
    if (tx.programId === "11111111111111111111111111111111") return "transfer"
    if (tx.programId.includes("metaplex")) return "nft"
    return "unknown"
  }
}

module.exports = WalletService
