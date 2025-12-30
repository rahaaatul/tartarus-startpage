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

// Notes API endpoints with enhanced features
const NOTES_FILE = path.join(__dirname, 'notes.json');
const NOTES_BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(NOTES_BACKUP_DIR)) {
  fs.mkdirSync(NOTES_BACKUP_DIR, { recursive: true });
}

// Helper function to create backup
function createBackup(notesData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(NOTES_BACKUP_DIR, `notes-${timestamp}.json`);
  try {
    fs.writeFileSync(backupFile, JSON.stringify(notesData, null, 2));
    // Keep only last 10 backups
    const backups = fs.readdirSync(NOTES_BACKUP_DIR)
      .filter(file => file.startsWith('notes-'))
      .sort()
      .reverse();

    if (backups.length > 10) {
      backups.slice(10).forEach(backup => {
        fs.unlinkSync(path.join(NOTES_BACKUP_DIR, backup));
      });
    }
  } catch (error) {
    console.warn('Failed to create backup:', error.message);
  }
}

// GET /api/v1/notes - Load notes with versioning
app.get('/api/v1/notes', (req, res) => {
  try {
    let notes = { content: '', timestamp: new Date().toISOString(), version: 1 };

    if (fs.existsSync(NOTES_FILE)) {
      const data = fs.readFileSync(NOTES_FILE, 'utf8');
      const parsedNotes = JSON.parse(data);

      // Ensure version exists
      notes = {
        content: parsedNotes.content || '',
        timestamp: parsedNotes.timestamp || new Date().toISOString(),
        version: parsedNotes.version || 1
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

// POST /api/v1/notes - Save notes with versioning and validation
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

    // Load existing notes for versioning
    let existingVersion = 1;
    if (fs.existsSync(NOTES_FILE)) {
      try {
        const existing = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
        existingVersion = (existing.version || 1) + 1;
      } catch (error) {
        console.warn('Failed to read existing notes for versioning:', error.message);
      }
    }

    // Prepare new notes data
    const newNotesData = {
      content: notesData.content,
      timestamp: notesData.timestamp || new Date().toISOString(),
      version: notesData.version || existingVersion
    };

    // Create backup of previous version
    if (fs.existsSync(NOTES_FILE)) {
      try {
        const previousData = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
        createBackup(previousData);
      } catch (error) {
        console.warn('Failed to create backup:', error.message);
      }
    }

    // Write new notes
    fs.writeFileSync(NOTES_FILE, JSON.stringify(newNotesData, null, 2));

    res.json({
      success: true,
      message: 'Notes saved successfully',
      data: {
        version: newNotesData.version,
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

// GET /api/v1/notes/version/:version - Load specific version
app.get('/api/v1/notes/version/:version', (req, res) => {
  try {
    const requestedVersion = parseInt(req.params.version);

    if (isNaN(requestedVersion) || requestedVersion < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid version number',
        timestamp: new Date().toISOString()
      });
    }

    // Check current version first
    if (fs.existsSync(NOTES_FILE)) {
      const currentData = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
      if (currentData.version === requestedVersion) {
        return res.json({
          success: true,
          data: currentData,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Look for backup
    const backups = fs.readdirSync(NOTES_BACKUP_DIR)
      .filter(file => file.startsWith('notes-'))
      .sort()
      .reverse();

    for (const backup of backups) {
      try {
        const backupPath = path.join(NOTES_BACKUP_DIR, backup);
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        if (backupData.version === requestedVersion) {
          return res.json({
            success: true,
            data: backupData,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn(`Failed to read backup ${backup}:`, error.message);
      }
    }

    res.status(404).json({
      success: false,
      error: `Version ${requestedVersion} not found`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading notes version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load notes version',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/notes/versions - List available versions
app.get('/api/v1/notes/versions', (req, res) => {
  try {
    const versions = [];

    // Add current version
    if (fs.existsSync(NOTES_FILE)) {
      const currentData = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
      versions.push({
        version: currentData.version || 1,
        timestamp: currentData.timestamp,
        type: 'current'
      });
    }

    // Add backup versions
    const backups = fs.readdirSync(NOTES_BACKUP_DIR)
      .filter(file => file.startsWith('notes-'))
      .sort()
      .reverse();

    for (const backup of backups) {
      try {
        const backupPath = path.join(NOTES_BACKUP_DIR, backup);
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        versions.push({
          version: backupData.version,
          timestamp: backupData.timestamp,
          type: 'backup'
        });
      } catch (error) {
        console.warn(`Failed to read backup ${backup}:`, error.message);
      }
    }

    // Remove duplicates and sort by version desc
    const uniqueVersions = versions
      .filter((v, index, self) => self.findIndex(v2 => v2.version === v.version) === index)
      .sort((a, b) => b.version - a.version);

    res.json({
      success: true,
      data: uniqueVersions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error listing versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list versions',
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/v1/notes - Clear all notes
app.delete('/api/v1/notes', (req, res) => {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      // Create backup before deleting
      const currentData = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
      createBackup(currentData);

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

app.listen(PORT, () => {
  console.log(`🚀 Search Suggestions Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Google endpoint: http://localhost:${PORT}/api/google-suggest?q=yourquery`);
  console.log(`🦆 DuckDuckGo endpoint: http://localhost:${PORT}/api/duckduckgo-suggest?q=yourquery`);
});
