# 🧩 AI Gateway API

[![CI](https://github.com/isaias4321/ai-gateway-api/actions/workflows/ci.yml/badge.svg)](https://github.com/isaias4321/ai-gateway-api/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

A unified gateway for multiple LLM providers (OpenAI, Anthropic) written
in Node.js + TypeScript. Instead of every application in a company
integrating directly with each provider's API, they talk to one
consistent API — and the gateway handles streaming, rate limiting,
caching, automatic retries, and provider switching with zero downtime.

> This is the kind of infrastructure real companies build around AI
> models in production. The project was built to demonstrate backend
> engineering skills applied to AI: it's not about "calling an API," it's
> about building a resilient, observable, strongly-typed layer around it.

## 🖼️ Demo

Walking through the interactive documentation (Swagger UI) and explaining
the gateway's three endpoints:

<video src="docs/demo.mp4" controls width="700">
  Your browser doesn't support embedded video — see the file at
  <a href="docs/demo.mp4">docs/demo.mp4</a>.
</video>

![Swagger UI showing the gateway's endpoints](docs/swagger-overview.png)

The test suite covering the rate limiter, cache, retry logic, and the
chat route — all with mocked providers, no real calls to any LLM API:

![23 tests passing: rate limiter, cache, retry, and the chat route](docs/tests.png)

Running inside Docker itself (`docker compose up --build`), with the
`HEALTHCHECK` automatically hitting `/health` every 30s and Swagger
responding normally through the port exposed by the container:

<video src="docs/docker-demo.mp4" controls width="700">
  Your browser doesn't support embedded video — see the file at
  <a href="docs/docker-demo.mp4">docs/docker-demo.mp4</a>.
</video>

![The /health endpoint responding through Swagger, served from inside the container](docs/docker-health.png)

## ⚙️ What the gateway solves

| Common problem when integrating multiple AIs directly in the code | How the gateway solves it |
|---|---|
| Every provider has a different request/response format | A single interface: `{ provider, model, messages }` for any of them |
| OpenAI/Anthropic rate limits get hit without warning | Its own rate limiting (token bucket) per client key, with an `x-ratelimit-remaining` header |
| Transient errors (429, 5xx) crash the application | Automatic retry with exponential backoff + jitter |
| Repeated questions cost money again | In-memory TTL cache for identical responses |
| Switching providers means rewriting the whole integration | Swappable adapters behind the same interface (`ProviderAdapter`) |

## 🧱 Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Language | TypeScript 6 (strict mode) |
| HTTP framework | Fastify 5 |
| Validation | Zod 4 |
| Logging | Pino (structured JSON logs) |
| Testing | Vitest 4 (23 tests, with network mocks) |
| Lint | ESLint 10 + typescript-eslint (flat config) |
| API docs | Swagger/OpenAPI (`@fastify/swagger`) at `/docs` |

## 📁 Structure

```
src/
├── config.ts                # environment variables, validated with Zod
├── app.ts                   # assembles Fastify: plugins + routes
├── server.ts                 # entrypoint
├── schemas/chat.ts            # request/response contracts (Zod)
├── providers/
│   ├── types.ts                 # ProviderAdapter interface
│   ├── openai.ts                  # OpenAI adapter
│   ├── anthropic.ts                # Anthropic adapter
│   └── registry.ts                  # builds the provider -> adapter map
├── lib/
│   ├── cache.ts                      # TtlCache (cache with expiration)
│   ├── rateLimiter.ts                  # TokenBucketRateLimiter
│   ├── retry.ts                          # exponential backoff + jitter
│   └── logger.ts                           # structured logger (pino)
├── plugins/auth.ts             # validates x-api-key
└── routes/
    ├── health.ts                  # GET /health (public)
    ├── models.ts                    # GET /v1/models
    └── chat.ts                        # POST /v1/chat/completions

test/                       # 23 tests: rate limiter, cache, retry, chat route
```

## 🚀 Running locally

```bash
git clone https://github.com/isaias4321/ai-gateway-api.git
cd ai-gateway-api
npm install
cp .env.example .env   # fill in OPENAI_API_KEY and/or ANTHROPIC_API_KEY
npm run dev
```

Visit the interactive documentation at **<http://localhost:3000/docs>**.

## 📡 Usage example

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [{ "role": "user", "content": "Explain what RAG is in one sentence." }]
  }'
```

Switching to Anthropic is just a matter of changing the `provider`
field — the rest of the contract stays identical:

```json
{ "provider": "anthropic", "model": "claude-sonnet-4-6", "messages": [...] }
```

**Streaming** (Server-Sent Events): add `"stream": true` to the request
body and consume the response as incremental text.

## 🧪 Running the tests

```bash
npm test          # runs the suite once
npm run typecheck # checks types without emitting a build
npm run lint       # checks code style/quality
```

The tests don't make real calls to the OpenAI/Anthropic APIs — providers
are mocked (`vi.fn()`), so the suite runs offline and deterministically.
This covers: authentication, input validation, cache hits, rate
limiting, and retry with backoff.

## 🐳 Running with Docker

The project already ships with a multi-stage `Dockerfile` (build stage
separate from the final image, no devDependencies in production) and a
`HEALTHCHECK` using the `/health` endpoint itself.

**With Docker Compose (recommended — spins up with a single command):**

```bash
cp .env.example .env   # fill in your keys before starting
docker compose up --build
```

Visit `http://localhost:3000/docs`. To stop it: `docker compose down`.

**With plain Docker, no compose:**

```bash
docker build -t ai-gateway-api .
docker run -p 3000:3000 --env-file .env ai-gateway-api
```

## ☁️ Deploy (Render — free)

The `Dockerfile` alone is enough to deploy to any container-based
platform. Step by step using [Render](https://render.com):

1. Create a new **Web Service** pointing to this repository
2. **Environment**: Docker (Render auto-detects the `Dockerfile`)
3. Under **Environment Variables**, add all the keys from `.env.example`
   (at least `GATEWAY_API_KEYS` and one real provider key —
   `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
4. **Health Check Path**: `/health` (Render uses this to know whether the
   service is up before routing traffic to it)
5. Deploy — the public URL will serve Swagger at `/docs`

> 💡 Render's free tier sleeps after 15 minutes of no traffic, which is
> fine for a portfolio demo but not for real production — for that, the
> Starter plan keeps the service always on.

## 🧠 Design decisions

- **Token bucket instead of a fixed window** for rate limiting: allows
  short traffic bursts without blocking the user, while still enforcing
  a sustained average cap — friendlier than a counter that resets all at
  once every minute.
- **Retry only on errors worth retrying**: 429 (rate limit) and 5xx
  (transient server error) trigger a retry; client-side 4xx errors (e.g.,
  a 400 validation error) don't — retrying wouldn't change the outcome.
- **Streaming via `reply.hijack()`**: Fastify takes full control of the
  HTTP response so it can relay the provider's stream in real time,
  without waiting for the full response before sending anything to the
  client.
- **Deterministic cache key**: the key is generated from the entire
  request body (canonicalized JSON), so only genuinely identical
  responses get reused.

## ⚠️ Note on versions

This project uses TypeScript 6.0.3 instead of the newly-released
TypeScript 7 (compiler rewritten in Go). Reason: at the time this project
was built, `typescript-eslint` didn't officially support TS 7 yet
(tracking issue). I'd rather have a project with fully working lint,
typecheck, and CI than use the newest version just for its own sake — but
it's worth revisiting once the lint ecosystem catches up to TS 7.

## ✅ Production readiness

What's already implemented and tested in this project:

- [x] Automated tests (23 tests, mocked providers, no real calls)
- [x] Multi-stage Docker + `HEALTHCHECK`
- [x] Docker Compose (spins up with one command)
- [x] CI (GitHub Actions): lint → typecheck → build → test on every push/PR
- [x] Environment variable validation with Zod (fails fast on bad config)
- [x] Interactive API documentation (Swagger/OpenAPI at `/docs`)
- [ ] Active public deployment (see the [☁️ Deploy](#️-deploy-render--free) section for the steps)
- [ ] Observability (metrics/tracing) — see roadmap below

## 🗺️ Possible improvements

- [ ] Support for more providers (Groq, Google Gemini, local models via Ollama)
- [ ] Distributed cache (Redis) to work across multiple replicas
- [ ] Distributed rate limiting (currently in-memory, per instance)
- [ ] Metrics via OpenTelemetry (per-provider latency, error rate, token usage)
- [ ] Automatic routing: pick the cheapest/fastest available provider

## 📄 License

MIT
