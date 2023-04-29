const { format, createLogger, transports } = require("winston");

const { combine, timestamp, printf } = format;

const customFormat = printf(({ message, timestamp }) => {
  return `${timestamp} ${message}`;
});

const logger = createLogger({
  level: "debug",
  format: combine(timestamp(), customFormat),
  transports: [new transports.Console()],
});

module.exports = logger;