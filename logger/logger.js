import winston from "winston";
const { combine, timestamp, printf } = winston.format;

const customFormat = printf(({ timestamp, message }) => {
  return `[${timestamp}] ${message}`;
});

let today = new Date();
let dateTime = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + "-" + today.getHours() + "-" + today.getMinutes() + "-" + today.getSeconds();

const logger = winston.createLogger({
  level: "debug",
  format: combine(timestamp({ format: "YYYY-MM-DDTHH:mm:ss", }), customFormat),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: `${dateTime}.log` })],
  silent: false, // set to true to disable logging
});

export default logger;