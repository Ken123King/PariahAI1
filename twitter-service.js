const axios = require("axios")

class TwitterService {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.bearerToken = null
  }

  async initialize() {
    if (!this.bearerToken) {
      await this.getBearerToken()
    }
  }

  async getBearerToken() {
    try {
      const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString("base64")
      const response = await axios.post("https://api.twitter.com/oauth2/token", "grant_type=client_credentials", {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      })

      this.bearerToken = response.data.access_token
      return this.bearerToken
    } catch (error) {
      console.error("Error getting Twitter bearer token:", error)
      throw new Error("Failed to authenticate with Twitter API")
    }
  }

  async searchTweets(query, count = 10) {
    await this.initialize()

    try {
      const response = await axios.get("https://api.twitter.com/1.1/search/tweets.json", {
        params: {
          q: query,
          count: count,
          result_type: "recent",
          tweet_mode: "extended",
        },
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      })

      return response.data.statuses.map((tweet) => ({
        id: tweet.id_str,
        author: tweet.user.name,
        authorHandle: tweet.user.screen_name,
        content: tweet.full_text,
        timestamp: tweet.created_at,
        likes: tweet.favorite_count,
        retweets: tweet.retweet_count,
        hashtags: tweet.entities.hashtags.map((tag) => tag.text),
        mentions: tweet.entities.user_mentions.map((mention) => mention.screen_name),
      }))
    } catch (error) {
      console.error("Error searching tweets:", error)
      throw new Error("Failed to search tweets")
    }
  }

  async getTrendingTopics(woeid = 1) {
    await this.initialize()

    try {
      const response = await axios.get(`https://api.twitter.com/1.1/trends/place.json?id=${woeid}`, {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      })

      return response.data[0].trends.map((trend) => ({
        name: trend.name,
        url: trend.url,
        query: trend.query,
        tweet_volume: trend.tweet_volume,
      }))
    } catch (error) {
      console.error("Error getting trending topics:", error)
      throw new Error("Failed to get trending topics")
    }
  }

  async postTweet(text) {
    // Note: Posting tweets requires OAuth 1.0a, not Bearer token
    // This is a simplified implementation
    console.log("Would post tweet:", text)
    return {
      id: `mock-${Date.now()}`,
      text,
    }
  }

  // Process tweets to extract hashtags and mentions
  processTwitterData(tweets) {
    const hashtags = {}
    const mentions = {}

    tweets.forEach((tweet) => {
      // Process hashtags
      tweet.hashtags.forEach((tag) => {
        hashtags[tag] = (hashtags[tag] || 0) + 1
      })

      // Process mentions
      tweet.mentions.forEach((mention) => {
        mentions[mention] = (mentions[mention] || 0) + 1
      })
    })

    // Convert to arrays sorted by count
    const hashtagArray = Object.entries(hashtags)
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)

    const mentionArray = Object.entries(mentions)
      .map(([mention, count]) => ({ mention, count }))
      .sort((a, b) => b.count - a.count)

    return {
      hashtags: hashtagArray,
      mentions: mentionArray,
    }
  }

  // Analyze sentiment of tweets (very basic implementation)
  analyzeSentiment(text) {
    const positiveWords = ["good", "great", "awesome", "excellent", "bullish", "moon", "profit", "gain", "up"]
    const negativeWords = ["bad", "terrible", "awful", "bearish", "crash", "dump", "rug", "scam", "down"]

    const words = text.toLowerCase().split(/\s+/)

    let positiveCount = 0
    let negativeCount = 0

    words.forEach((word) => {
      if (positiveWords.includes(word)) positiveCount++
      if (negativeWords.includes(word)) negativeCount++
    })

    if (positiveCount > negativeCount) return "positive"
    if (negativeCount > positiveCount) return "negative"
    return "neutral"
  }
}

module.exports = TwitterService
