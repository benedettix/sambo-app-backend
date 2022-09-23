const port = 5000;
const ServerConfig = {
  port: port,
  serverRunningMsg: `Server is running on port: ${port}`.cyan.bold,
  link: `http://localhost:${port}`,
};

module.exports = ServerConfig;
