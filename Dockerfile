FROM python:3.12-slim

WORKDIR /app

# EitaaBun runs in its own container on the same Docker network.
ENV EITAA_SERVICE_URL=http://eitaa-bun:1234 \
    EITAA_STATE_DIR=/app/data/eitaa-state \
    EITAA_MEDIA_DIR=/shared/eitaa-media

COPY API/requirements.txt /app/API/requirements.txt

RUN pip install --no-cache-dir -r /app/API/requirements.txt

RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium && \
    rm -rf /var/lib/apt/lists/*


COPY . /app

EXPOSE 8085
EXPOSE 8005

CMD uvicorn API.main:app --host 0.0.0.0 --port 8005 & \
    python -m http.server 8085 --directory Frontend
