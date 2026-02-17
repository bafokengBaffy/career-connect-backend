// cluster.js - For production load balancing
const cluster = require('cluster');
const os = require('os');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.resolve(__dirname, '.env.production') });

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`🖥️  Master ${process.pid} is running`);
  console.log(`🔄 Setting up ${numCPUs} workers...\n`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit and restart
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️  Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  // Handle worker online
  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

} else {
  // Workers can share any TCP connection
  require('./server.js');
  console.log(`🚀 Worker ${process.pid} started`);
}