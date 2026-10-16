FROM python:3.12-slim

WORKDIR /app

# All services run inside this one container.
ENV EITAA_SERVICE_URL=http://127.0.0.1:1234 \
    EITAA_STATE_DIR=/app/data/eitaa-state \
    EITAA_MEDIA_DIR=/shared/eitaa-media

COPY API/requirements.txt /app/API/requirements.txt

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git ca-certificates chromium bash && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir -r /app/API/requirements.txt && \
    curl -fsSL https://bun.sh/install | bash

ENV PATH="/root/.bun/bin:${PATH}"

ARG EITAABUN_REF=7c03eaf0c8de5d81822441a179413e5ea18e8db2
RUN git clone https://github.com/ghaemifard/EitaaBun.git /opt/EitaaBun && \
    cd /opt/EitaaBun && \
    git checkout --detach "${EITAABUN_REF}" && \
    bun install

COPY . /app
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh && \
    mkdir -p /app/data/eitaa-state /root/eitaSessions /shared/eitaa-media

EXPOSE 8085 8005

CMD ["/app/start.sh"]
