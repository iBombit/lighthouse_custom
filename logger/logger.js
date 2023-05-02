const { format, createLogger, transports } = require("winston");

const { combine, timestamp, printf } = format;

const customFormat = printf(({ timestamp, message }) => {
  return `${timestamp} ${message}`;
});

let today = new Date();
let dateTime = today.getFullYear() + '-' + (today.getMonth()+1) + '-' +today.getDate() + '-' + today.getHours() + "-" + today.getMinutes() + "-" + today.getSeconds();

const logger = createLogger({
  level: "debug",
  format: combine(timestamp({format: "YYYY-MM-DDTHH:mm:ss",}), customFormat),
  transports: [new transports.Console(), new transports.File({filename: `${dateTime}.log`})],
  silent: false, // set to true to disable logging
});

module.exports = logger;