const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple XML parser for Google suggestions
function parseGoogleXML(xmlString) {
  const suggestions = [];
  // Extract suggestions from XML format like:
  // <toplevel><CompleteSuggestion><suggestion data="suggestion text"/></CompleteSuggestion></toplevel>
  const suggestionMatches = xmlString.match(/data="([^"]*)"/g);
  if (suggestionMatches) {
    suggestionMatches.forEach(match => {
      const suggestion = match.match(/data="([^"]*)"/)[1];
      if (suggestion) suggestions.push(suggestion);
    });
  }
  return suggestions;
}

const app = express();
const PORT = 3001;

// Enable CORS for all routes - allow network access
app.use(cors({
  origin: true, // Allow all origins for network access
  credentials: true
}));

// Parse JSON bodies with increased limit
app.use(express.json({ limit: '10mb' }));

// Google Suggest API proxy
app.get('/api/google-suggest', (req, res) => {
  const query = req.query.q || '';
  const url = `https://suggestqueries.google.com/complete/search?client=toolbar&hl=en&q=${encodeURIComponent(query)}`;

  console.log('Proxying Google request:', url);

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        console.log('Google raw response:', data.substring(0, 200) + '...');

        // Try JSON first (some Google endpoints return JSON)
        try {
          const parsedData = JSON.parse(data);
          console.log('Google JSON response:', parsedData);

          // Google returns: ["query", ["suggestion1", "suggestion2", ...], [...], [...], {...}]
          const suggestions = Array.isArray(parsedData) && Array.isArray(parsedData[1]) ? parsedData[1] : [];

          res.json({
            success: true,
            suggestions: suggestions,
            provider: 'google'
          });
        } catch (jsonError) {
          // If JSON parsing fails, try XML parsing
          console.log('JSON parsing failed, trying XML parsing');
          const suggestions = parseGoogleXML(data);
          console.log('Google XML parsed suggestions:', suggestions);

          res.json({
            success: true,
            suggestions: suggestions,
            provider: 'google'
          });
        }
      } catch (error) {
        console.error('Error parsing Google response:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to parse Google response',
          suggestions: []
        });
      }
    });
  }).on('error', (error) => {
    console.error('Google API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google suggestions',
      suggestions: []
    });
  });
});

// DuckDuckGo API proxy
app.get('/api/duckduckgo-suggest', (req, res) => {
  const query = req.query.q || '';
  const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;

  console.log('Proxying DuckDuckGo request:', url);

  https.get(url, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        console.log('DuckDuckGo response:', parsedData);

        // DuckDuckGo returns: [{"phrase": "suggestion1"}, {"phrase": "suggestion2"}, ...]
        const suggestions = Array.isArray(parsedData) ? parsedData.map(item => item.phrase).filter(Boolean) : [];

        res.json({
          success: true,
          suggestions: suggestions,
          provider: 'duckduckgo'
        });
      } catch (error) {
        console.error('Error parsing DuckDuckGo response:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to parse DuckDuckGo response',
          suggestions: []
        });
      }
    });
  }).on('error', (error) => {
    console.error('DuckDuckGo API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DuckDuckGo suggestions',
      suggestions: []
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Search suggestions proxy server is running',
    timestamp: new Date().toISOString()
  });
});

// Auto-start endpoint for browser integration
app.get('/api/start-server', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is already running - this endpoint is for future auto-start functionality',
    timestamp: new Date().toISOString()
  });
});

// Notes API endpoints
const NOTES_FILE = path.join(__dirname, 'notes.json');

// GET /api/v1/notes - Load notes
app.get('/api/v1/notes', (req, res) => {
  try {
    let notes = { content: '', timestamp: new Date().toISOString() };

    if (fs.existsSync(NOTES_FILE)) {
      const data = fs.readFileSync(NOTES_FILE, 'utf8');
      const parsedNotes = JSON.parse(data);

      notes = {
        content: parsedNotes.content || '',
        timestamp: parsedNotes.timestamp || new Date().toISOString()
      };
    }

    res.json({
      success: true,
      data: notes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load notes',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/notes - Save notes
app.post('/api/v1/notes', (req, res) => {
  try {
    const notesData = req.body;

    // Validation
    if (!notesData || typeof notesData.content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid notes data: content must be a string',
        timestamp: new Date().toISOString()
      });
    }

    if (notesData.content.length > 100000) { // 100KB limit
      return res.status(400).json({
        success: false,
        error: 'Content exceeds maximum length (100KB)',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare new notes data
    const newNotesData = {
      content: notesData.content,
      timestamp: new Date().toISOString()
    };

    // Write new notes
    fs.writeFileSync(NOTES_FILE, JSON.stringify(newNotesData, null, 2));

    res.json({
      success: true,
      message: 'Notes saved successfully',
      data: {
        timestamp: newNotesData.timestamp
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save notes',
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/v1/notes - Clear all notes
app.delete('/api/v1/notes', (req, res) => {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      fs.unlinkSync(NOTES_FILE);
    }

    res.json({
      success: true,
      message: 'Notes cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notes',
      timestamp: new Date().toISOString()
    });
  }
});

// Backward compatibility - redirect old endpoints to v1
app.get('/api/notes', (req, res) => {
  res.redirect(307, '/api/v1/notes');
});

app.post('/api/notes', (req, res) => {
  res.redirect(307, '/api/v1/notes');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Search Suggestions Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health or http://192.168.1.11:${PORT}/api/health`);
  console.log(`🔍 Google endpoint: http://localhost:${PORT}/api/google-suggest?q=yourquery`);
  console.log(`🦆 DuckDuckGo endpoint: http://localhost:${PORT}/api/duckduckgo-suggest?q=yourquery`);
  console.log(`📝 Notes API: http://localhost:${PORT}/api/v1/notes`);
});
