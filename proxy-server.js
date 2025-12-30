const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const mime = require('mime-types');

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

// Download server functionality
const DEFAULT_ROOT_PATH = __dirname;

// Browse directory
app.get('/browse', (req, res) => {
  const dirPath = req.query.path || '';
  const rootPath = req.query.root || '.';
  const fullRootPath = path.isAbsolute(rootPath) ? rootPath : path.resolve(DEFAULT_ROOT_PATH, rootPath);
  const fullPath = path.join(fullRootPath, dirPath);

  console.log('Browse request:', { dirPath, rootPath, fullRootPath, fullPath });

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('Directory not found');
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    return res.redirect(`/download?path=${encodeURIComponent(dirPath)}&type=file`);
  }

  renderDirectory(fullPath, dirPath, res);
});

// Download file or directory
app.get('/download', (req, res) => {
  const itemPath = req.query.path || '';
  const type = req.query.type || 'file';
  const rootPath = req.query.root || '.';
  const fullRootPath = path.isAbsolute(rootPath) ? rootPath : path.resolve(DEFAULT_ROOT_PATH, rootPath);
  const fullPath = path.join(fullRootPath, itemPath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('File or directory not found');
  }

  if (type === 'file') {
    serveFile(fullPath, itemPath, res);
  } else if (type === 'dir') {
    serveDirectory(fullPath, itemPath, res);
  } else {
    res.status(400).send('Invalid type');
  }
});

// Bulk download multiple files/folders as ZIP
app.get('/download/bulk', (req, res) => {
  const paths = req.query.paths;
  const rootPath = req.query.root || '.';
  if (!paths) {
    return res.status(400).send('No paths specified');
  }

  let pathArray;
  try {
    pathArray = JSON.parse(paths);
  } catch (error) {
    return res.status(400).send('Invalid paths format');
  }

  if (!Array.isArray(pathArray) || pathArray.length === 0) {
    return res.status(400).send('Paths must be a non-empty array');
  }

  serveBulkZip(pathArray, rootPath, res);
});

// Helper function to render directory
function renderDirectory(fullPath, relativePath, res) {
  fs.readdir(fullPath, { withFileTypes: true }, (err, items) => {
    if (err) {
      return res.status(500).send('Error reading directory');
    }

    const parentPath = path.dirname(relativePath);
    const parentLink = parentPath !== '.' ? `<a href="/browse?path=${encodeURIComponent(parentPath)}">../</a><br>` : '';

    const itemsHtml = items.map(item => {
      const itemPath = path.join(relativePath, item.name);
      const displayName = item.isDirectory() ? `${item.name}/` : item.name;

      if (item.isDirectory()) {
        return `
          <div class="item directory">
            <a href="/browse?path=${encodeURIComponent(itemPath)}">${displayName}</a>
            <a href="/download?path=${encodeURIComponent(itemPath)}&type=dir" class="download-link">[Download ZIP]</a>
          </div>
        `;
      } else {
        return `
          <div class="item file">
            <a href="/download?path=${encodeURIComponent(itemPath)}&type=file">${displayName}</a>
          </div>
        `;
      }
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Download Server - ${relativePath || 'Root'}</title>
        <style>
          body {
            font-family: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace;
            margin: 0;
            padding: 20px;
            background: #1d2021;
            color: #d4be98;
            line-height: 1.5;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: #32302f;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(212, 190, 152, 0.1);
          }
          h1 {
            color: #d4be98;
            border-bottom: 2px solid #d4be98;
            padding-bottom: 10px;
            margin-top: 0;
            font-size: 1.5rem;
          }
          .item {
            padding: 12px 0;
            border-bottom: 1px solid rgba(212, 190, 152, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 200ms ease;
          }
          .item:hover {
            background: rgba(212, 190, 152, 0.05);
            border-radius: 4px;
          }
          .item a {
            text-decoration: none;
            color: #d4be98;
            font-weight: 500;
          }
          .item a:hover {
            color: #a9b665;
            text-decoration: underline;
          }
          .directory a:first-child {
            font-weight: bold;
            color: #7daea3;
          }
          .download-link {
            color: #89b482;
            font-size: 0.9em;
            padding: 4px 8px;
            border: 1px solid #89b482;
            border-radius: 4px;
            transition: all 200ms ease;
          }
          .download-link:hover {
            background: #89b482;
            color: #1d2021;
            text-decoration: none;
          }
          .path {
            color: rgba(212, 190, 152, 0.7);
            font-size: 0.9em;
            margin-bottom: 20px;
            padding: 8px 12px;
            background: rgba(212, 190, 152, 0.05);
            border-radius: 4px;
          }
          .parent-link {
            margin-bottom: 16px;
            padding: 8px 12px;
            background: rgba(212, 190, 152, 0.05);
            border-radius: 4px;
            display: inline-block;
          }
          .parent-link a {
            color: #7daea3;
          }
          .parent-link a:hover {
            color: #a9b665;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📁 Directory Browser</h1>
          <div class="path">Current path: ${relativePath || 'Root'}</div>
          ${parentPath !== '.' ? `<div class="parent-link"><a href="/browse?path=${encodeURIComponent(parentPath)}">⬆️ Parent Directory</a></div>` : ''}
          ${itemsHtml}
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });
}

// Helper function to serve file
function serveFile(fullPath, relativePath, res) {
  const stat = fs.statSync(fullPath);
  const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
  const fileName = path.basename(relativePath);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const stream = fs.createReadStream(fullPath);
  stream.pipe(res);
}

// Helper function to serve directory as ZIP
function serveDirectory(fullPath, relativePath, res) {
  const dirName = path.basename(relativePath) || 'root';
  const zipFileName = `${dirName}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

  const archive = archiver('zip', {
    zlib: { level: 0 } // Store mode - no compression
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  // Add directory contents to zip
  archive.directory(fullPath, dirName);

  archive.finalize();
}

// Helper function to serve bulk ZIP with multiple files/folders
function serveBulkZip(paths, rootPath, res) {
  const fullRootPath = path.isAbsolute(rootPath) ? rootPath : path.resolve(DEFAULT_ROOT_PATH, rootPath);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const zipFileName = `bulk-download-${timestamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

  const archive = archiver('zip', {
    zlib: { level: 0 } // Store mode - no compression
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  // Add each path to the ZIP
  paths.forEach(itemPath => {
    const fullPath = path.join(fullRootPath, itemPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`Bulk ZIP: Path not found: ${fullPath}`);
      return;
    }

    const stat = fs.statSync(fullPath);
    const itemName = path.basename(itemPath);

    if (stat.isDirectory()) {
      // Add directory with its contents
      archive.directory(fullPath, itemName);
    } else {
      // Add file
      archive.file(fullPath, { name: itemName });
    }
  });

  archive.finalize();
}

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
  console.log(`⬇️ Download browser: http://localhost:${PORT}/browse`);
});
