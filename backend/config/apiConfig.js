// apiConfig.js placeholder
// This file exports API configuration settings
// API keys are loaded from environment variables (.env file)

module.exports = {
    newsApi: {
      key: process.env.NEWS_API_KEY,
      baseUrl: 'https://newsapi.org/v2',
      defaultParams: {
        language: 'en',
        pageSize: 20
      }
    },
    gnewsApi: {
      key: process.env.GNEWS_API_KEY,
      baseUrl: 'https://gnews.io/api/v4',
      defaultParams: {
        lang: 'en',
        max: 10
      }
    },
    database: {
      connectionString: process.env.MONGODB_URI
    }
  };