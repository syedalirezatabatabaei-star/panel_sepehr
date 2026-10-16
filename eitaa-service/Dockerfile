FROM oven/bun:1.1.38

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/EitaaBun

ARG EITAABUN_REF=7c03eaf0c8de5d81822441a179413e5ea18e8db2
RUN git init . \
    && git remote add origin https://github.com/ghaemifard/EitaaBun.git \
    && git fetch --depth 1 origin "${EITAABUN_REF}" \
    && git checkout --detach FETCH_HEAD \
    && bun install

ENV HOME=/root
RUN mkdir -p /root/eitaSessions /shared/eitaa-media
EXPOSE 1234
CMD ["bun", "run", "index.ts"]
