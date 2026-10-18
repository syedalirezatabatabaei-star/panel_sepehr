# Build the Eitaa service separately so Bun, Git and build-time files
# are not kept in the final Python runtime image.
FROM python:3.12-slim AS eitaa-build

# Reuse the Bun image already available on the build host instead of using its older Debian base.
COPY --from=oven/bun:1.1.38 /usr/local/bin/bun /usr/local/bin/bun

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/EitaaBun
ARG EITAABUN_REF=7c03eaf0c8de5d81822441a179413e5ea18e8db2

# Fetch only the pinned commit instead of cloning the full Git history.
RUN git init . \
    && git remote add origin https://github.com/ghaemifard/EitaaBun.git \
    && git fetch --depth 1 origin "${EITAABUN_REF}" \
    && git checkout --detach FETCH_HEAD

# Fix a bug that masks the actual Eitaa RPC error: sendError must receive
# Express's response object, not the Eitaa RPC result. Log the RPC error and
# caught exception so FLOOD_WAIT / protocol errors remain diagnosable.
RUN python - <<'PY'
from pathlib import Path
p = Path("/opt/EitaaBun/src/web/AuthController.ts")
s = p.read_text()
old = '''            }else{
                this.sendError(res,"error in sending code")
            }
        }catch(e){
            this.sendError(resp,"error in connection");
        }'''
new = '''            }else{
                console.error("[EITAA SEND CODE RPC ERROR]", JSON.stringify(res));
                const rpcError = res && (res.text || res.error_message || res._);
                this.sendError(resp, typeof rpcError === "string" ? rpcError : "error in sending code");
            }
        }catch(e){
            console.error("[EITAA SEND CODE EXCEPTION]", e);
            this.sendError(resp,"error in connection");
        }'''
if old not in s:
    raise SystemExit("AuthController target block not found; refusing to build with an unapplied patch")
p.write_text(s.replace(old, new, 1))
PY

RUN cd /opt/EitaaBun && bun install --production && rm -rf .git

FROM python:3.12-slim

WORKDIR /app

ENV EITAA_SERVICE_URL=http://127.0.0.1:1234 \
    EITAA_STATE_DIR=/app/data/eitaa-state \
    EITAA_MEDIA_DIR=/shared/eitaa-media \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Chromium is used by the Bale Playwright integration.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates chromium bash unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to keep this layer cacheable when app code changes.
COPY API/requirements.txt /app/API/requirements.txt
RUN pip install --no-cache-dir -r /app/API/requirements.txt

# Copy only the Bun runtime and the pinned Eitaa service into the final image.
COPY --from=eitaa-build /usr/local/bin/bun /usr/local/bin/bun
COPY --from=eitaa-build /opt/EitaaBun /opt/EitaaBun

COPY . /app

RUN chmod +x /app/start.sh \
    && mkdir -p /app/data/eitaa-state /root/eitaSessions /shared/eitaa-media

EXPOSE 8085 8005

CMD ["/app/start.sh"]
