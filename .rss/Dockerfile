FROM node:24-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY sources.json ./

RUN mkdir -p data

EXPOSE 3030

CMD ["npm", "start"]
