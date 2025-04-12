const axios = require("axios")

class PumpFunService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseUrl = "https://api.pump.fun"
  }

  async getTrendingTokens(limit = 10) {
    try {
      const response = await axios.get(`${this.baseUrl}/tokens/trending`, {
        params: { limit },
        headers: {
          "X-API-KEY": this.apiKey,
        },
      })

      return response.data.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        price: token.price,
        volume24h: token.volume24h,
        volumeChange24h: token.volumeChange24h,
        marketCap: token.marketCap,
        priceChange24h: token.priceChange24h,
      }))
    } catch (error) {
      console.error("Error getting trending tokens:", error)
      throw new Error("Failed to get trending tokens from PumpFun")
    }
  }

  async getTokenInfo(symbol) {
    try {
      const response = await axios.get(`${this.baseUrl}/tokens/${symbol}`, {
        headers: {
          "X-API-KEY": this.apiKey,
        },
      })

      return {
        symbol: response.data.symbol,
        name: response.data.name,
        price: response.data.price,
        volume24h: response.data.volume24h,
        marketCap: response.data.marketCap,
        priceChange24h: response.data.priceChange24h,
        totalSupply: response.data.totalSupply,
        holders: response.data.holders,
      }
    } catch (error) {
      console.error(`Error getting token info for ${symbol}:`, error)
      throw new Error(`Failed to get token info for ${symbol}`)
    }
  }

  async detectVolumeAnomalies(threshold = 50) {
    try {
      const tokens = await this.getTrendingTokens(50)

      // Detect anomalies based on volume change
      const anomalies = tokens
        .filter((token) => token.volumeChange24h < -threshold)
        .map((token) => {
          // Calculate severity based on volume change
          let severity
          if (token.volumeChange24h < -80) severity = "critical"
          else if (token.volumeChange24h < -70) severity = "high"
          else if (token.volumeChange24h < -60) severity = "medium"
          else severity = "low"

          // Calculate rug probability (simplified)
          const rugProbability = Math.min(100, Math.abs(token.volumeChange24h) + 20)

          return {
            id: `anomaly-${token.symbol}`,
            symbol: token.symbol,
            name: token.name,
            normalVolume: token.volume24h / (1 + token.volumeChange24h / 100),
            currentVolume: token.volume24h,
            percentageChange: Math.abs(token.volumeChange24h),
            detectedAt: new Date().toISOString(),
            severity,
            rugProbability,
          }
        })

      return anomalies
    } catch (error) {
      console.error("Error detecting volume anomalies:", error)
      throw new Error("Failed to detect volume anomalies")
    }
  }
}

module.exports = PumpFunService
