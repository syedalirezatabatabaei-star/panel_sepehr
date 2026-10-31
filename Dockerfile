FROM python:3.12-slim

WORKDIR /app

ENV GOOMNI_URL=http://goomni:3000
    RUBIKA_STATE_DIR=/app/data/rubika-state
    EITAA_SERVICE_URL=http://eitaa-service:1234 \
    EITAA_STATE_DIR=/app/data/eitaa-state \
    EITAA_MEDIA_DIR=/shared/eitaa-media \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates chromium bash unzip \
    && rm -rf /var/lib/apt/lists/*

COPY API/requirements.txt /app/API/requirements.txt
RUN pip install --no-cache-dir -r /app/API/requirements.txt

COPY . /app

RUN chmod +x /app/start.sh \
    && mkdir -p /app/data/eitaa-state /root/eitaSessions /shared/eitaa-media

EXPOSE 8085 8005

HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8005/health', timeout=3)" || exit 1

CMD ["/app/start.sh"]
