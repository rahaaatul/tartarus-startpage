const { spawn } = require('child_process');

console.log('🚀 Starting development servers...');
console.log('Frontend: http://localhost:8000');
console.log('Backend:  http://localhost:3001');
console.log('Press Ctrl+C to stop all servers');

// Start proxy server
const proxyServer = spawn('node', ['proxy-server.js'], {
  stdio: 'inherit'
});

// Start frontend server
const frontendServer = spawn('python', ['-m', 'http.server', '8000'], {
  stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  proxyServer.kill();
  frontendServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  proxyServer.kill();
  frontendServer.kill();
  process.exit(0);
});

// Keep the process alive
setInterval(() => {
  // Check if servers are still running
  if (proxyServer.exitCode !== null || frontendServer.exitCode !== null) {
    console.log('One of the servers has stopped. Exiting...');
    process.exit(1);
  }
}, 1000);
