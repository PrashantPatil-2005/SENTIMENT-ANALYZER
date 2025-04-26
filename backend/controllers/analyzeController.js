// analyzeController.js placeholder
const sentimentService = require('../services/sentimentService');
const NewsAnalysis = require('../models/NewsAnalysis');

// Fetch news and analyze sentiment
exports.analyzeNews = async (req, res) => {
  try {
    const { query, sources, dateFrom, dateTo } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Fetch news articles
    const newsArticles = await sentimentService.fetchNews(query, sources, dateFrom, dateTo);
    
    if (!newsArticles || newsArticles.length === 0) {
      return res.status(404).json({ message: 'No news articles found for the given query' });
    }

    // Analyze sentiment for each article
    const analyzedArticles = await sentimentService.analyzeSentiment(newsArticles);
    
    // Calculate aggregate sentiment scores
    const aggregateScores = calculateAggregateScores(analyzedArticles);
    
    // Save analysis results to database
    const analysisRecord = new NewsAnalysis({
      query,
      sources: sources || 'all',
      dateRange: {
        from: dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default to 1 week ago
        to: dateTo || new Date()
      },
      articles: analyzedArticles.map(article => ({
        title: article.title,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt,
        sentiment: article.sentiment
      })),
      aggregateScores
    });
    
    await analysisRecord.save();

    res.status(200).json({
      articles: analyzedArticles,
      aggregateScores,
      id: analysisRecord._id
    });
    
  } catch (error) {
    console.error('Error analyzing news:', error);
    res.status(500).json({ error: 'Failed to analyze news articles' });
  }
};

// Get past analyses
exports.getPastAnalyses = async (req, res) => {
  try {
    const { limit = 10, query } = req.query;
    
    let findQuery = {};
    if (query) {
      findQuery.query = { $regex: query, $options: 'i' };
    }
    
    const analyses = await NewsAnalysis.find(findQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('query sources dateRange aggregateScores createdAt');
    
    res.status(200).json(analyses);
  } catch (error) {
    console.error('Error fetching past analyses:', error);
    res.status(500).json({ error: 'Failed to fetch past analyses' });
  }
};

// Get trending topics based on recent analyses
exports.getTrendingTopics = async (req, res) => {
  try {
    // Get analyses from the past week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const analyses = await NewsAnalysis.find({
      createdAt: { $gte: oneWeekAgo }
    }).select('query articles.sentiment');
    
    // Extract keywords and their sentiment
    const topics = {};
    analyses.forEach(analysis => {
      const keywords = extractKeywords(analysis.query);
      keywords.forEach(keyword => {
        if (!topics[keyword]) {
          topics[keyword] = {
            count: 0,
            sentiment: 0
          };
        }
        topics[keyword].count += 1;
        
        // Add average sentiment for this analysis
        const avgSentiment = analysis.articles.reduce((sum, article) => 
          sum + article.sentiment.score, 0) / analysis.articles.length || 0;
        
        topics[keyword].sentiment += avgSentiment;
      });
    });
    
    // Calculate average sentiment and sort by count
    const trendingTopics = Object.keys(topics).map(keyword => ({
      keyword,
      count: topics[keyword].count,
      averageSentiment: topics[keyword].sentiment / topics[keyword].count
    })).sort((a, b) => b.count - a.count).slice(0, 10);
    
    res.status(200).json(trendingTopics);
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({ error: 'Failed to fetch trending topics' });
  }
};

// Helper function to calculate aggregate sentiment scores
function calculateAggregateScores(articles) {
  const totalArticles = articles.length;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let sumScore = 0;
  
  articles.forEach(article => {
    sumScore += article.sentiment.score;
    
    if (article.sentiment.score > 0.05) {
      positiveCount++;
    } else if (article.sentiment.score < -0.05) {
      negativeCount++;
    } else {
      neutralCount++;
    }
  });
  
  return {
    averageScore: sumScore / totalArticles,
    positivePercentage: (positiveCount / totalArticles) * 100,
    neutralPercentage: (neutralCount / totalArticles) * 100,
    negativePercentage: (negativeCount / totalArticles) * 100
  };
}

// Helper function to extract keywords from a query
function extractKeywords(query) {
  // Simple implementation - split by spaces and filter out common words
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
  return query.toLowerCase()
    .split(' ')
    .filter(word => word.length > 2 && !commonWords.includes(word));
}