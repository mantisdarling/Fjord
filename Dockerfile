FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server ./server
COPY web ./web
USER node
EXPOSE 8787
CMD ["node", "server/app.mjs"]
