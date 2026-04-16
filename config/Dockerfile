FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y cron

# Set work directory
WORKDIR /app

# Copy files
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Start both cron + django
CMD service cron start && python manage.py runserver 0.0.0.0:8000











# # Base image
# FROM python:3.11-slim

# # Prevent Python from writing pyc files
# ENV PYTHONDONTWRITEBYTECODE=1
# ENV PYTHONUNBUFFERED=1

# # Set working directory
# WORKDIR /app

# # Install system dependencies
# RUN apt-get update && apt-get install -y \
#     gcc \
#     libpq-dev \
#     && rm -rf /var/lib/apt/lists/*

# # Copy requirements first (for caching)
# COPY requirements.txt .

# # Install Python dependencies
# RUN pip install --upgrade pip
# RUN pip install -r requirements.txt

# # Copy project
# COPY . .

# # Expose port
# EXPOSE 8000

# # Run server
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]