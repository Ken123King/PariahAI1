# Pariah AI Backend

A Node.js/Express backend for the Pariah AI project with Twitter tracking, PumpFun integration, and wallet tracking functionality.

## Features

- **Twitter Integration**: Track trending topics, search tweets, and post updates
- **PumpFun Integration**: Get trending tokens, token info, and detect volume anomalies
- **Wallet Tracking**: Monitor Solana wallets, track transactions, and detect liquidations
- **Redis Integration**: Cache data and store wallet tracking information

## Getting Started

1. Clone the repository:
   \`\`\`
   git clone https://github.com/yourusername/pariah-ai-backend.git
   cd pariah-ai-backend
   \`\`\`

2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

3. Create a `.env` file based on `.env.example` and fill in your API keys and credentials.

4. Start the server:
   \`\`\`
   npm start
   \`\`\`

The server will run on port 3001 by default.

## API Endpoints

### Twitter

- `GET /api/twitter`: Get Twitter data (tweets, hashtags, mentions, topics)
- `GET /api/twitter/topics`: Get trending topics
- `POST /api/twitter/post`: Post to Twitter

### PumpFun

- `GET /api/pumpfun/trending`: Get trending tokens
- `GET /api/pumpfun/token/:symbol`: Get token info
- `GET /api/pumpfun/anomalies`: Detect volume anomalies

### Wallets

- `GET /api/wallets/:address`: Get wallet data
- `POST /api/wallets/track`: Track wallet
- `POST /api/wallets/untrack`: Untrack wallet
- `GET /api/wallets/liquidated`: Get liquidated wallets

## Deployment to Render

1. Push your code to GitHub.

2. Create a new Web Service on Render:
   - Connect your GitHub repository
   - Select the branch to deploy
   - Set the build command to `npm install`
   - Set the start command to `node index.js`
   - Add your environment variables from `.env`

3. Click "Create Web Service" and Render will deploy your application.

## Environment Variables

- `PORT`: Port to run the server on (default: 3001)
- `KV_REST_API_URL`: Upstash Redis URL
- `KV_REST_API_TOKEN`: Upstash Redis token
- `X_API_KEY`: X (Twitter) API key
- `X_API_SECRET`: X (Twitter) API secret
- `PUMPFUN_API_KEY`: PumpFun API key
