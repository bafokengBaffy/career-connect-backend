module.exports = {
  apps: [{
    name: 'career-connect-api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    kill_timeout: 5000,
    listen_timeout: 5000,
    shutdown_with_message: true,
    increment_var: 'PORT',
    node_args: '--max-old-space-size=1024',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};