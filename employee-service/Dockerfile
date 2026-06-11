FROM node:18-alpine AS base
WORKDIR /app
COPY employee-service/package*.json ./employee-service/
COPY shared/utils/package*.json ./shared/utils/
RUN cd employee-service && npm ci --only=production
RUN cd shared/utils && npm ci --only=production

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/employee-service/node_modules ./employee-service/node_modules
COPY --from=base /app/shared/utils/node_modules ./shared/utils/node_modules
COPY employee-service ./employee-service
COPY shared ./shared
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
USER nodeuser
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/employees/health',(r)=>r.statusCode===200?process.exit(0):process.exit(1))"
WORKDIR /app/employee-service
CMD ["node", "index.js"]
