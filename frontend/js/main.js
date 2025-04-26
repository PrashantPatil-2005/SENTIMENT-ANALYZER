// API endpoint URL - change this to your deployed backend URL
const API_BASE_URL = 'http://localhost:5000/api';

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchQuery = document.getElementById('search-query');
const dateFrom = document.getElementById('date-from');
const dateTo = document.getElementById('date-to');
const sourcesSelect = document.getElementById('sources');
const loadingSection = document.getElementById('loading');
const resultsSection = document.getElementById('results');
const searchTermSpan = document.getElementById('search-term');
const overallSentimentSpan = document.getElementById('overall-sentiment');
const scoreGauge = document.getElementById('score-gauge');
const gaugePointer = document.querySelector('.gauge-pointer');
const positiveBar = document.getElementById('positive-bar');
const neutralBar = document.getElementById('neutral-bar');
const negativeBar = document.getElementById('negative-bar');
const positivePercentage = document.getElementById('positive-percentage');
const neutralPercentage = document.getElementById('neutral-percentage');
const negativePercentage = document.getElementById('negative-percentage');
const keywordsContainer = document.getElementById('keywords-container');
const articlesList = document.getElementById('articles-list');
const trendingTopics = document.getElementById('trending-topics');
const historyList = document.getElementById('history-list');

// Set default date values (last week to today)
const today = new Date();
const lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);

dateFrom.valueAsDate = lastWeek;
dateTo.valueAsDate = today;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Fetch trending topics
  fetchTrendingTopics();
  
  // Fetch recent analyses
  fetchRecentAnalyses();
});

// Event Listeners
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  analyzeNews();
});

// Analyze News Function
async function analyzeNews() {
  const query = searchQuery.value.trim();
  
  if (!query) {
    alert('Please enter a search query');
    return;
  }
  
  // Show loading screen
  loadingSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        sources: sourcesSelect.value,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze news');
    }
    
    const data = await response.json();
    
    // Hide loading and show results
    loadingSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    
    // Display results
    displayResults(query, data);
    
    // Refresh history list
    fetchRecentAnalyses();
    
  } catch (error) {
    console.error('Error analyzing news:', error);
    loadingSection.classList.add('hidden');
    alert('Error analyzing news. Please try again later.');
  }
}

// Display Analysis Results
function displayResults(query, data) {
  // Set search term
  searchTermSpan.textContent = query;
  
  // Calculate overall sentiment label
  const overallScore = data.aggregateScores.averageScore;
  let sentimentLabel = 'Neutral';
  let sentimentClass = 'neutral';
  
  if (overallScore > 0.05) {
    sentimentLabel = 'Positive';
    sentimentClass = 'positive';
  } else if (overallScore < -0.05) {
    sentimentLabel = 'Negative';
    sentimentClass = 'negative';
  }
  
  // Set overall sentiment text
  overallSentimentSpan.textContent = sentimentLabel;
  overallSentimentSpan.className = sentimentClass;
  
  // Rotate gauge pointer (-90 to +90 degrees based on score -1 to +1)
  const pointerRotation = overallScore * 90;
  gaugePointer.style.transform = `rotate(${pointerRotation}deg)`;
  
  // Set sentiment bars
  positiveBar.style.width = `${data.aggregateScores.positivePercentage}%`;
  neutralBar.style.width = `${data.aggregateScores.neutralPercentage}%`;
  negativeBar.style.width = `${data.aggregateScores.negativePercentage}%`;
  
  positivePercentage.textContent = `${Math.round(data.aggregateScores.positivePercentage)}%`;
  neutralPercentage.textContent = `${Math.round(data.aggregateScores.neutralPercentage)}%`;
  negativePercentage.textContent = `${Math.round(data.aggregateScores.negativePercentage)}%`;
  
  // Extract and display keywords
  displayKeywords(data.articles);
  
  // Display articles
  displayArticles(data.articles);
}

// Extract and display emotional keywords
function displayKeywords(articles) {
  // Clear previous keywords
  keywordsContainer.innerHTML = '';
  
  // Collect all keywords
  const allKeywords = [];
  articles.forEach(article => {
    if (article.sentiment && article.sentiment.keywords) {
      article.sentiment.keywords.forEach(keyword => {
        allKeywords.push(keyword);
      });
    }
  });
  
  // Sort by absolute score and take top 10
  allKeywords.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const topKeywords = allKeywords.slice(0, 10);
  
  // Display keywords
  topKeywords.forEach(keyword => {
    const keywordElement = document.createElement('span');
    keywordElement.textContent = keyword.word;
    
    let keywordClass = 'neutral';
    if (keyword.score > 0.05) {
      keywordClass = 'positive';
    } else if (keyword.score < -0.05) {
      keywordClass = 'negative';
    }
    
    keywordElement.className = `keyword ${keywordClass}`;
    keywordsContainer.appendChild(keywordElement);
  });
  
  // If no keywords found
  if (topKeywords.length === 0) {
    keywordsContainer.innerHTML = '<p>No significant emotional keywords found</p>';
  }
}

// Display articles
function displayArticles(articles) {
  // Clear previous articles
  articlesList.innerHTML = '';
  
  articles.forEach(article => {
    let sentimentClass = 'neutral';
    let sentimentLabel = 'Neutral';
    
    if (article.sentiment.score > 0.05) {
      sentimentClass = 'positive';
      sentimentLabel = 'Positive';
    } else if (article.sentiment.score < -0.05) {
      sentimentClass = 'negative';
      sentimentLabel = 'Negative';
    }
    
    const publishedDate = new Date(article.publishedAt).toLocaleDateString();
    
    const articleElement = document.createElement('div');
    articleElement.className = 'article-card';
    articleElement.innerHTML = `
      <div class="article-header">
        <span class="article-source">${article.source}</span>
        <span class="sentiment-tag ${sentimentClass}">${sentimentLabel}</span>
      </div>
      <div class="article-content">
        <h4 class="article-title">
          <a href="${article.url}" target="_blank">${article.title}</a>
        </h4>
        <div class="article-date">${publishedDate}</div>
      </div>
    `;
    
    articlesList.appendChild(articleElement);
  });
  
  // If no articles found
  if (articles.length === 0) {
    articlesList.innerHTML = '<p>No articles found for the given query</p>';
  }
}

// Fetch trending topics
async function fetchTrendingTopics() {
  try {
    const response = await fetch(`${API_BASE_URL}/trending`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch trending topics');
    }
    
    const data = await response.json();
    
    // Clear previous topics
    trendingTopics.innerHTML = '';
    
    // Display trending topics
    data.forEach(topic => {
      let sentimentClass = 'neutral';
      
      if (topic.averageSentiment > 0.05) {
        sentimentClass = 'positive';
      } else if (topic.averageSentiment < -0.05) {
        sentimentClass = 'negative';
      }
      
      const topicElement = document.createElement('div');
      topicElement.className = 'trending-topic';
      topicElement.innerHTML = `
        <span class="sentiment-indicator ${sentimentClass}"></span>
        <span>${topic.keyword}</span>
      `;
      
      // Add click event to search for this topic
      topicElement.addEventListener('click', () => {
        searchQuery.value = topic.keyword;
        searchForm.dispatchEvent(new Event('submit'));
      });
      
      trendingTopics.appendChild(topicElement);
    });
    
    // If no trending topics found
    if (data.length === 0) {
      trendingTopics.innerHTML = '<p>No trending topics found</p>';
    }
    
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    trendingTopics.innerHTML = '<p>Failed to load trending topics</p>';
  }
}

// Fetch recent analyses
async function fetchRecentAnalyses() {
  try {
    const response = await fetch(`${API_BASE_URL}/analyses?limit=5`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch recent analyses');
    }
    
    const data = await response.json();
    
    // Clear previous history items
    historyList.innerHTML = '';
    
    // Display history items
    data.forEach(analysis => {
      const dateString = new Date(analysis.createdAt).toLocaleDateString();
      
      let sentimentClass = 'neutral';
      let sentimentLabel = 'Neutral';
      
      if (analysis.aggregateScores.averageScore > 0.05) {
        sentimentClass = 'positive';
        sentimentLabel = 'Positive';
      } else if (analysis.aggregateScores.averageScore < -0.05) {
        sentimentClass = 'negative';
        sentimentLabel = 'Negative';
      }
      
      const historyElement = document.createElement('div');
      historyElement.className = 'history-item';
      historyElement.innerHTML = `
        <div class="query">${analysis.query}</div>
        <div class="meta">
          <span>${dateString}</span>
          <span>Sources: ${analysis.sources}</span>
        </div>
        <div class="sentiment-summary">
          <span class="sentiment-pill ${sentimentClass}">${sentimentLabel}</span>
          <span>Positive: ${Math.round(analysis.aggregateScores.positivePercentage)}%</span>
          <span>Negative: ${Math.round(analysis.aggregateScores.negativePercentage)}%</span>
        </div>
      `;
      
      // Add click event to reload this analysis
      historyElement.addEventListener('click', () => {
        searchQuery.value = analysis.query;
        searchForm.dispatchEvent(new Event('submit'));
      });
      
      historyList.appendChild(historyElement);
    });
    
    // If no history found
    if (data.length === 0) {
      historyList.innerHTML = '<p>No analysis history found</p>';
    }
    
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    historyList.innerHTML = '<p>Failed to load analysis history</p>';
  }
}

// Helper function to format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}