FROM denoland/deno:2.8.0 AS source

WORKDIR /app

COPY deno.json deno.lock vite.config.ts ./
COPY client.ts main.ts utils.ts ./
COPY components ./components
COPY islands ./islands
COPY lib ./lib
COPY routes ./routes
COPY static ./static
COPY tests ./tests

FROM source AS test
ENV KV_PATH=/tmp/spanish-srs-test.kv
CMD ["deno", "task", "verify"]

FROM source AS build
RUN deno task build

FROM denoland/deno:2.8.0 AS runtime

WORKDIR /app

COPY --from=build /app/deno.json /app/deno.lock ./
COPY --from=build /app/_fresh ./_fresh
COPY --from=build /app/static ./static

ENV HOST=0.0.0.0
ENV PORT=8000
ENV KV_PATH=/data/spanish-srs.kv

# Create the KV volume mount point owned by the non-root deno user so the
# server can write the Deno KV database at runtime.
RUN mkdir -p /data && chown deno:deno /data
USER deno

VOLUME ["/data"]
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["deno", "eval", "const r = await fetch('http://127.0.0.1:8000/api/stats'); Deno.exit(r.ok ? 0 : 1);"]

CMD ["deno", "serve", "-A", "--unstable-kv", "--host", "0.0.0.0", "--port", "8000", "_fresh/server.js"]
