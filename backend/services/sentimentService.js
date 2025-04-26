// sentimentService.js placeholder
const axios = require('axios');
const natural = require('natural');
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();

const analyzer = new Analyzer("English", stemmer, "afinn");
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2/everything';

// Fetch news articles based on query and filters
exports.fetchNews = async (query, sources, dateFrom, dateTo) => {
  try {
    const params = {
      q: query,
      apiKey: NEWS_API_KEY,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 20
    };
    
    if (sources) {
      params.sources = sources;
    }
    
    if (dateFrom) {
      params.from = formatDate(dateFrom);
    }
    
    if (dateTo) {
      params.to = formatDate(dateTo);
    }
    
    const response = await axios.get(NEWS_API_URL, { params });
    
    if (response.data && response.data.articles) {
      return response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // If News API fails or quota exceeded, use gnews as fallback
    try {
      return await fetchNewsFromGnews(query, dateFrom, dateTo);
    } catch (fallbackError) {
      console.error('Fallback news API also failed:', fallbackError);
      throw new Error('Failed to fetch news from all available sources');
    }
  }
};

// Analyze sentiment of news articles
exports.analyzeSentiment = async (articles) => {
  return articles.map(article => {
    const combinedText = `${article.title} ${article.description || ''} ${article.content || ''}`;
    const tokens = tokenizer.tokenize(combinedText);
    const score = analyzer.getSentiment(tokens);
    
    let sentiment = {
      score,
      label: getSentimentLabel(score),
      keywords: extractEmotionalKeywords(tokens, score)
    };
    
    return {
      ...article,
      sentiment
    };
  });
};

// Helper function to get sentiment label based on score
function getSentimentLabel(score) {
  if (score > 0.05) {
    return 'positive';
  } else if (score < -0.05) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

// Helper function to extract emotional keywords
function extractEmotionalKeywords(tokens, overallScore) {
  // Create a map of tokens to their sentiment contribution
  const tokenSentiment = {};
  tokens.forEach(token => {
    const tokenScore = analyzer.getSentiment([token]);
    if (Math.abs(tokenScore) > 0.3) {
      tokenSentiment[token] = tokenScore;
    }
  });
  
  // Sort by absolute sentiment strength and take top 5
  return Object.keys(tokenSentiment)
    .sort((a, b) => Math.abs(tokenSentiment[b]) - Math.abs(tokenSentiment[a]))
    .slice(0, 5)
    .map(token => ({
      word: token,
      score: tokenSentiment[token]
    }));
}

// Format date for API requests
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

// Fallback function to fetch news from gnews.io (free API with limited quota)
async function fetchNewsFromGnews(query, dateFrom, dateTo) {
  const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
  const GNEWS_API_URL = 'https://gnews.io/api/v4/search';
  
  const params = {
    q: query,
    token: GNEWS_API_KEY,
    lang: 'en',
    max: 10
  };
  
  if (dateFrom) {
    params.from = formatDate(dateFrom);
  }
  
  if (dateTo) {
    params.to = formatDate(dateTo);
  }
  
  const response = await axios.get(GNEWS_API_URL, { params });
  
  if (response.data && response.data.articles) {
    return response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt
    }));
  }
  
  return [];
}