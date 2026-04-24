FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PYTHON_BIN=python3

RUN apk add --no-cache python3 g++ openjdk21-jdk

COPY package.json ./
COPY server.js ./
COPY public ./public

RUN mkdir -p /data

EXPOSE 4173

CMD ["node", "server.js"]
