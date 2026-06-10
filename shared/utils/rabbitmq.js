const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const connect = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://admin:password@localhost:5672");
      channel = await connection.createChannel();
      await channel.assertExchange("enterprise.events", "topic", { durable: true });
      logger.info("✅ RabbitMQ connected");

      connection.on("error", () => reconnect());
      connection.on("close", () => reconnect());
      return channel;
    } catch (err) {
      logger.error(`RabbitMQ attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Could not connect to RabbitMQ");
};

const reconnect = async () => {
  channel = null; connection = null;
  await new Promise((r) => setTimeout(r, 5000));
  await connect();
};

const publish = async (routingKey, data) => {
  if (!channel) throw new Error("RabbitMQ not connected");
  const message = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
  channel.publish("enterprise.events", routingKey, Buffer.from(message), {
    persistent: true, contentType: "application/json",
  });
  logger.info(`📤 Published: ${routingKey}`);
};

const subscribe = async (queueName, routingKeys, handler) => {
  if (!channel) throw new Error("RabbitMQ not connected");
  await channel.assertQueue(queueName, { durable: true });
  for (const key of routingKeys) {
    await channel.bindQueue(queueName, "enterprise.events", key);
  }
  channel.prefetch(1);
  channel.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      await handler(msg.fields.routingKey, data);
      channel.ack(msg);
    } catch (err) {
      logger.error("Message processing error:", { error: err.message });
      channel.nack(msg, false, false);
    }
  });
  logger.info(`👂 Subscribed: ${queueName} → [${routingKeys.join(", ")}]`);
};

module.exports = { connect, publish, subscribe, getChannel: () => channel };
