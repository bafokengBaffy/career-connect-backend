const axios = require('axios');

const newsController = {
  // Get business and career news
  getBusinessNews: async (req, res) => {
    try {
      const { country = 'ls', category = 'business', pageSize = 10, page = 1 } = req.query;
      
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          country,
          category,
          pageSize,
          page,
          apiKey: process.env.REACT_APP_NEWS_API_KEY
        }
      });

      const news = response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        imageUrl: article.urlToImage,
        source: article.source.name,
        publishedAt: article.publishedAt,
        content: article.content
      }));

      res.status(200).json({
        success: true,
        data: {
          articles: news,
          totalResults: response.data.totalResults,
          currentPage: parseInt(page)
        }
      });
    } catch (error) {
      console.error('News API error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch news',
        message: error.message 
      });
    }
  },

  // Get Lesotho-specific news
  getLesothoNews: async (req, res) => {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'Lesotho OR Maseru economy business jobs',
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 15,
          apiKey: process.env.REACT_APP_NEWS_API_KEY
        }
      });

      const lesothoNews = response.data.articles
        .filter(article => 
          article.title && 
          article.description && 
          (article.title.toLowerCase().includes('lesotho') || 
           article.description.toLowerCase().includes('lesotho') ||
           article.content?.toLowerCase().includes('lesotho'))
        )
        .map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          imageUrl: article.urlToImage,
          source: article.source.name,
          publishedAt: article.publishedAt,
          relevance: 'lesotho'
        }));

      res.status(200).json({
        success: true,
        data: {
          articles: lesothoNews.slice(0, 10),
          totalResults: lesothoNews.length
        }
      });
    } catch (error) {
      console.error('Lesotho news error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Lesotho news' 
      });
    }
  },

  // Get career and job market news
  getCareerNews: async (req, res) => {
    try {
      const queries = [
        'recruitment hiring',
        'job market',
        'career development',
        'employment trends',
        'workplace skills'
      ];

      const newsPromises = queries.map(query =>
        axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: query,
            language: 'en',
            sortBy: 'relevancy',
            pageSize: 3,
            apiKey: process.env.REACT_APP_NEWS_API_KEY
          }
        })
      );

      const responses = await Promise.all(newsPromises);
      let allArticles = [];

      responses.forEach(response => {
        if (response.data.articles) {
          allArticles = [...allArticles, ...response.data.articles];
        }
      });

      // Remove duplicates and format
      const uniqueArticles = Array.from(
        new Map(allArticles.map(article => [article.url, article])).values()
      ).map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        imageUrl: article.urlToImage,
        source: article.source.name,
        publishedAt: article.publishedAt,
        category: 'career'
      }));

      res.status(200).json({
        success: true,
        data: {
          articles: uniqueArticles.slice(0, 12),
          totalResults: uniqueArticles.length
        }
      });
    } catch (error) {
      console.error('Career news error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch career news' 
      });
    }
  },

  // Search news by keywords
  searchNews: async (req, res) => {
    try {
      const { q, language = 'en', sortBy = 'relevancy', pageSize = 20 } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q,
          language,
          sortBy,
          pageSize,
          apiKey: process.env.REACT_APP_NEWS_API_KEY
        }
      });

      const searchResults = response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        imageUrl: article.urlToImage,
        source: article.source.name,
        publishedAt: article.publishedAt,
        relevanceScore: 0 // Could implement relevance scoring
      }));

      res.status(200).json({
        success: true,
        data: {
          articles: searchResults,
          totalResults: response.data.totalResults,
          query: q
        }
      });
    } catch (error) {
      console.error('News search error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'News search failed' 
      });
    }
  }
};

module.exports = newsController;