// pm2 ecosystem config — CommonJS required by pm2
// Start all:  pm2 start ecosystem.config.cjs
// Status:     pm2 status
// Logs:       pm2 logs <name>
module.exports = {
  apps: [
    {
      name: "factory-scheduler",
      script: "scripts/factory.mjs",
      args: "--schedule",
      node_args: "--env-file=.env.local",
      cwd: "E:\\WebProjects\\TheCleanCode",
      interpreter: "node",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      out_file: "logs/factory-scheduler-out.log",
      error_file: "logs/factory-scheduler-err.log",
      time: true,
    },
    {
      name: "dashboard",
      script: "scripts/dashboard-server.mjs",
      node_args: "--env-file=.env.local",
      cwd: "E:\\WebProjects\\TheCleanCode",
      interpreter: "node",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,
      out_file: "logs/dashboard-out.log",
      error_file: "logs/dashboard-err.log",
      time: true,
    },
    {
      name: "ngrok-dashboard",
      script: "C:\\Users\\delik\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\\ngrok.exe",
      args: "http --url=king-suspense-buffing.ngrok-free.dev 4000",
      interpreter: "none",
      cwd: "E:\\WebProjects\\TheCleanCode",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      out_file: "logs/ngrok-out.log",
      error_file: "logs/ngrok-err.log",
      time: true,
    },
  ],
};
