const { createLogger, format, transports } = require("winston");

const SERVICE_NAME = process.env.SERVICE_NAME || "enterprise-desk";

const logger=createLogger({
    level:process.env.LOG_LEVEL || "info",
    format: process.env.NODE_ENV==="production"
    ? format.combine(format.timestamp(), format.json())
    : format.combine(
           format.colorize(),
                format.timestamp({ format: "HH:mm:ss" }),
                format.printf(({ level, message, timestamp, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
                  return `${timestamp} [${SERVICE_NAME}] ${level}: ${message}${metaStr}`;
                })
    ),
      defaultMeta: { service: SERVICE_NAME },
      transports: [new transports.Console()],
})
module.exports = logger;