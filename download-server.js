const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const mime = require('mime-types');

class DownloadServer {
  constructor(port = 3001, rootPath = process.cwd()) {
    this.port = port;
    this.rootPath = rootPath;
    this.app = express();
    this.server = null;
    this.setupRoutes();
  }

  setupRoutes() {
    // Serve static files from root path
    this.app.use(express.static(this.rootPath));

    // Browse directory
    this.app.get('/browse', (req, res) => {
      const dirPath = req.query.path || '';
      const fullPath = path.join(this.rootPath, dirPath);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).send('Directory not found');
      }

      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory()) {
        return res.redirect(`/download?path=${encodeURIComponent(dirPath)}&type=file`);
      }

      this.renderDirectory(fullPath, dirPath, res);
    });

    // Download file or directory
    this.app.get('/download', (req, res) => {
      const itemPath = req.query.path || '';
      const type = req.query.type || 'file';
      const fullPath = path.join(this.rootPath, itemPath);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).send('File or directory not found');
      }

      if (type === 'file') {
        this.serveFile(fullPath, itemPath, res);
      } else if (type === 'dir') {
        this.serveDirectory(fullPath, itemPath, res);
      } else {
        res.status(400).send('Invalid type');
      }
    });

    // Root redirect to browse
    this.app.get('/', (req, res) => {
      res.redirect('/browse');
    });
  }

  renderDirectory(fullPath, relativePath, res) {
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
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 2px solid #d4be98; padding-bottom: 10px; }
            .item { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
            .item:hover { background: #f9f9f9; }
            .item a { text-decoration: none; color: #007acc; }
            .item a:hover { text-decoration: underline; }
            .directory a:first-child { font-weight: bold; color: #d4be98; }
            .download-link { color: #28a745; font-size: 0.9em; }
            .path { color: #666; font-size: 0.9em; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📁 Directory Browser</h1>
            <div class="path">Current path: ${relativePath || 'Root'}</div>
            ${parentLink}
            ${itemsHtml}
          </div>
        </body>
        </html>
      `;

      res.send(html);
    });
  }

  serveFile(fullPath, relativePath, res) {
    const stat = fs.statSync(fullPath);
    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    const fileName = path.basename(relativePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  }

  serveDirectory(fullPath, relativePath, res) {
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

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Download server running on http://localhost:${this.port}`);
        resolve();
      }).on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Download server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isRunning() {
    return this.server && this.server.listening;
  }
}

module.exports = DownloadServer;

// If run directly
if (require.main === module) {
  const server = new DownloadServer();
  server.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down download server...');
    await server.stop();
    process.exit(0);
  });
}
