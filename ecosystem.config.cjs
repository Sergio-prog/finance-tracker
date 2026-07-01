module.exports = {
  apps: [
    {
      name: 'finance-tracker',
      script: './node_modules/.bin/srvx',
      args: 'serve --prod --host=127.0.0.1 --static=/var/www/finance.serhiifotex.dev/dist/client --entry dist/server/server.js',
      cwd: '/var/www/finance.serhiifotex.dev',
      instances: 1,
      exec_mode: 'fork',
      interpreter_args: ['--env-file=.env'],
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      min_uptime: '10s',
      max_restarts: 5,
      kill_timeout: 5000,
    },
  ],
}
