FROM python:3.11-slim

# Install ffmpeg, opencv dependencies, and clean up apt cache to keep image small
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port (Cloud Run sets PORT env var)
ENV PORT=8080
EXPOSE 8080

CMD ["python", "app.py"]