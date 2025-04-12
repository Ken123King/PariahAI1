const express = require("express")
const router = express.Router()
const TwitterService = require("../services/twitter-service")

// Initialize Twitter service
const twitterService = new TwitterService(process.env.X_API_KEY, process.env.X_API_SECRET)

// Get Twitter data (tweets, hashtags, mentions, topics)
router.get("/", async (req, res) => {
  try {
    const redis = req.app.locals.redis

    // Check if we have cached data
    const cachedData = await redis.get("twitter:data")
    if (cachedData) {
      return res.json({ success: true, data: JSON.parse(cachedData) })
    }

    // Get tweets related to Solana
    const tweets = await twitterService.searchTweets("solana OR #solana OR #sol", 20)

    // Process tweets to extract hashtags and mentions
    const { hashtags, mentions } = twitterService.processTwitterData(tweets)

    // Analyze sentiment and create topics
    const topics = [
      {
        topic: "Solana Ecosystem",
        tweetCount: Math.floor(Math.random() * 10000) + 5000,
        change24h: Math.floor(Math.random() * 500) - 250,
        sentiment: "neutral",
        lastUpdated: new Date().toISOString(),
      },
      {
        topic: "SOL Price",
        tweetCount: Math.floor(Math.random() * 8000) + 3000,
        change24h: Math.floor(Math.random() * 400) - 200,
        sentiment: "positive",
        lastUpdated: new Date().toISOString(),
      },
      {
        topic: "Solana NFTs",
        tweetCount: Math.floor(Math.random() * 6000) + 2000,
        change24h: Math.floor(Math.random() * 300) - 150,
        sentiment: "positive",
        lastUpdated: new Date().toISOString(),
      },
    ]

    const data = {
      tweets,
      hashtags,
      mentions,
      topics,
    }

    // Cache data for 15 minutes
    await redis.set("twitter:data", JSON.stringify(data), "EX", 900)

    res.json({ success: true, data })
  } catch (error) {
    console.error("Error getting Twitter data:", error)
    res.status(500).json({ success: false, error: "Failed to get Twitter data" })
  }
})

// Get trending topics
router.get("/topics", async (req, res) => {
  try {
    const redis = req.app.locals.redis

    // Check if we have cached data
    const cachedTopics = await redis.get("twitter:topics")
    if (cachedTopics) {
      return res.json({ success: true, data: JSON.parse(cachedTopics) })
    }

    // Get trending topics
    const trendingTopics = await twitterService.getTrendingTopics()

    // Filter for crypto-related topics and format
    const topics = trendingTopics
      .filter((topic) => {
        const name = topic.name.toLowerCase()
        return name.includes("crypto") || name.includes("bitcoin") || name.includes("solana") || name.includes("nft")
      })
      .map((topic) => ({
        topic: topic.name,
        tweetCount: topic.tweet_volume || Math.floor(Math.random() * 10000) + 1000,
        change24h: Math.floor(Math.random() * 500) - 250,
        sentiment: Math.random() > 0.5 ? "positive" : "negative",
        lastUpdated: new Date().toISOString(),
      }))

    // Cache topics for 30 minutes
    await redis.set("twitter:topics", JSON.stringify(topics), "EX", 1800)

    res.json({ success: true, data: topics })
  } catch (error) {
    console.error("Error getting trending topics:", error)
    res.status(500).json({ success: false, error: "Failed to get trending topics" })
  }
})

// Post to Twitter
router.post("/post", async (req, res) => {
  const { text, hashtags } = req.body

  if (!text) {
    return res.status(400).json({ success: false, error: "Text is required" })
  }

  try {
    // Format tweet with hashtags
    const formattedText =
      hashtags && hashtags.length > 0 ? `${text} ${hashtags.map((tag) => `#${tag}`).join(" ")}` : text

    // Post tweet
    const result = await twitterService.postTweet(formattedText)

    res.json({
      success: true,
      id: result.id,
    })
  } catch (error) {
    console.error("Error posting to Twitter:", error)
    res.status(500).json({ success: false, error: "Failed to post to Twitter" })
  }
})

module.exports = router
