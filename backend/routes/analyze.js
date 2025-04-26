// analyze.js placeholder
const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');

// POST endpoint to analyze news sentiment
router.post('/analyze', analyzeController.analyzeNews);

// GET endpoint to fetch past analyses (with optional filters)
router.get('/analyses', analyzeController.getPastAnalyses);

// GET endpoint to fetch trending topics
router.get('/trending', analyzeController.getTrendingTopics);

module.exports = router;