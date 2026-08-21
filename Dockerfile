FROM node:20-slim

# Install system dependencies (ffmpeg is useful for metadata/validation)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Expose port (Cloud Run sets PORT env var)
ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start"]