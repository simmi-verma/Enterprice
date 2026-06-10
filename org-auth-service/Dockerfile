FROM node:22-alpine AS base
WORKDIR /app
COPY org-auth-service/package*.json ./org-auth-service/
COPY shared/utils/package*.json ./shared/utils/
RUN cd org-auth-service && npm ci --only=production
RUN cd shared/utils && npm ci --only=production
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=base /app/org-auth-service/node_modules ./org-auth-service/node_modules
COPY --from=base /app/shared/utils/node_modules ./shared/utils/node_modules
COPY org-auth-service ./org-auth-service
COPY shared ./shared
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
USER nodeuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/orgs/health',(r)=>r.statusCode===200?process.exit(0):process.exit(1))"
WORKDIR /app/org-auth-service
CMD ["node", "index.js"]
