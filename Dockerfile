FROM python:3.12-slim

WORKDIR /app

# ArvanCloud hosts the Debian repositories used by the official Python slim image.
# Rewrite both legacy sources.list and current deb822 .sources entries.
RUN set -eux; \
    for source in /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do \
        [ -f "$source" ] || continue; \
        sed -i \
            -e 's|https\?://deb.debian.org/debian-security|http://mirror.arvancloud.ir/debian-security|g' \
            -e 's|https\?://security.debian.org/debian-security|http://mirror.arvancloud.ir/debian-security|g' \
            -e 's|https\?://deb.debian.org/debian|http://mirror.arvancloud.ir/debian|g' \
            "$source"; \
    done; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates bash unzip; \
    rm -rf /var/lib/apt/lists/*

# ArvanCloud does not currently publish a PyPI repository.
# Use the documented Iranian PyPI mirror; this can be overridden at build time.
ARG PYPI_INDEX_URL=https://package-mirror.liara.ir/repository/pypi/simple
ENV GOOMNI_URL=http://goomni:3000 \
    RUBIKA_STATE_DIR=/app/data/rubika-state \
    EITAA_SERVICE_URL=http://eitaa-service:1234 \
    EITAA_STATE_DIR=/app/data/eitaa-state \
    EITAA_MEDIA_DIR=/shared/eitaa-media \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_INDEX_URL=${PYPI_INDEX_URL}

COPY API/requirements.txt /app/API/requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r /app/API/requirements.txt

COPY . /app

RUN chmod +x /app/start.sh \
    && mkdir -p /app/data/eitaa-state /app/data/rubika-state /root/eitaSessions /shared/eitaa-media

EXPOSE 8085 8005

HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8005/health', timeout=3)" || exit 1

CMD ["/app/start.sh"]
