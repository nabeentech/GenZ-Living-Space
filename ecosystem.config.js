module.exports = {
  apps: [{
    name: 'genz-living-space',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/genz-living-space',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    // Graceful shutdown
    kill_timeout: 10000,
    listen_timeout: 5000,
    shutdown_with_message: true
  }]
};
