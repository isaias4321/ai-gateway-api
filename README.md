# 🧩 AI Gateway API

[![CI](https://github.com/isaias4321/ai-gateway-api/actions/workflows/ci.yml/badge.svg)](https://github.com/isaias4321/ai-gateway-api/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

Um gateway unificado para múltiplos provedores de LLM (OpenAI, Anthropic)
escrito em Node.js + TypeScript. Em vez de cada aplicação da empresa
integrar diretamente com a API de cada provedor, elas falam com uma única
API consistente — e o gateway cuida de streaming, rate limiting, cache,
retry automático e troca de provedor sem downtime.

> Este é o tipo de infraestrutura que empresas reais constroem ao redor de
> modelos de IA em produção. O projeto foi feito para demonstrar
> competências de engenharia de backend aplicada a IA: não é sobre "chamar
> uma API", é sobre construir uma camada resiliente, observável e tipada em
> volta dela.

## 🖼️ Demo

Navegação pela documentação interativa (Swagger UI) e explicação dos três
endpoints do gateway:

<video src="docs/demo.mp4" controls width="700">
  Seu navegador não suporta vídeo embutido — veja o arquivo em
  <a href="docs/demo.mp4">docs/demo.mp4</a>.
</video>

![Swagger UI com os endpoints do gateway](docs/swagger-overview.png)

A suíte de testes cobrindo rate limiter, cache, retry e a rota de chat —
tudo com providers mockados, sem chamadas reais às APIs de LLM:

![23 testes passando: rate limiter, cache, retry e rota de chat](docs/tests.png)

Rodando dentro do próprio Docker (`docker compose up --build`), com o
`HEALTHCHECK` batendo automaticamente em `/health` a cada 30s e o Swagger
respondendo normalmente pela porta exposta pelo container:

<video src="docs/docker-demo.mp4" controls width="700">
  Seu navegador não suporta vídeo embutido — veja o arquivo em
  <a href="docs/docker-demo.mp4">docs/docker-demo.mp4</a>.
</video>

![Endpoint /health respondendo através do Swagger, servido de dentro do container](docs/docker-health.png)

## ⚙️ O que o gateway resolve

| Problema comum ao integrar múltiplas IAs direto no código | Como o gateway resolve |
|---|---|
| Cada provedor tem um formato de request/response diferente | Uma única interface: `{ provider, model, messages }` para qualquer um |
| Rate limit da OpenAI/Anthropic estoura sem aviso | Rate limiting próprio (token bucket) por chave de cliente, com header `x-ratelimit-remaining` |
| Erros transitórios (429, 5xx) derrubam a aplicação | Retry automático com backoff exponencial + jitter |
| Perguntas repetidas custam dinheiro de novo | Cache em memória com TTL para respostas idênticas |
| Trocar de provedor exige reescrever a integração inteira | Adapters intercambiáveis atrás da mesma interface (`ProviderAdapter`) |

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 |
| Linguagem | TypeScript 6 (strict mode) |
| Framework HTTP | Fastify 5 |
| Validação | Zod 4 |
| Logging | Pino (logs estruturados em JSON) |
| Testes | Vitest 4 (23 testes, com mocks de rede) |
| Lint | ESLint 10 + typescript-eslint (flat config) |
| Docs da API | Swagger/OpenAPI (`@fastify/swagger`) em `/docs` |

## 📁 Estrutura

```
src/
├── config.ts                # variáveis de ambiente, validadas com Zod
├── app.ts                   # monta o Fastify: plugins + rotas
├── server.ts                 # entrypoint
├── schemas/chat.ts            # contratos de request/response (Zod)
├── providers/
│   ├── types.ts                 # interface ProviderAdapter
│   ├── openai.ts                  # adapter OpenAI
│   ├── anthropic.ts                # adapter Anthropic
│   └── registry.ts                  # monta o mapa provider -> adapter
├── lib/
│   ├── cache.ts                      # TtlCache (cache com expiração)
│   ├── rateLimiter.ts                  # TokenBucketRateLimiter
│   ├── retry.ts                          # backoff exponencial + jitter
│   └── logger.ts                           # logger estruturado (pino)
├── plugins/auth.ts             # valida x-api-key
└── routes/
    ├── health.ts                  # GET /health (público)
    ├── models.ts                    # GET /v1/models
    └── chat.ts                        # POST /v1/chat/completions

test/                       # 23 testes: rate limiter, cache, retry, rota de chat
```

## 🚀 Como rodar localmente

```bash
git clone https://github.com/isaias4321/ai-gateway-api.git
cd ai-gateway-api
npm install
cp .env.example .env   # preencha OPENAI_API_KEY e/ou ANTHROPIC_API_KEY
npm run dev
```

Acesse a documentação interativa em **<http://localhost:3000/docs>**.

## 📡 Exemplo de uso

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "messages": [{ "role": "user", "content": "Explique o que é RAG em uma frase." }]
  }'
```

Trocar para a Anthropic é só mudar o campo `provider` — o resto do contrato
é idêntico:

```json
{ "provider": "anthropic", "model": "claude-sonnet-4-6", "messages": [...] }
```

**Streaming** (Server-Sent Events): adicione `"stream": true` ao corpo da
requisição e consuma a resposta como texto incremental.

## 🧪 Rodando os testes

```bash
npm test          # roda a suíte uma vez
npm run typecheck # verifica tipos sem gerar build
npm run lint       # verifica qualidade/estilo de código
```

Os testes não fazem chamadas reais às APIs da OpenAI/Anthropic — os
provedores são mockados (`vi.fn()`), então a suíte roda offline e de forma
determinística. Isso cobre: autenticação, validação de entrada, cache-hit,
rate limiting e retry com backoff.

## 🐳 Rodando com Docker

O projeto já vem com um `Dockerfile` multi-stage (build separado da imagem
final, sem devDependencies em produção) e `HEALTHCHECK` usando o próprio
endpoint `/health`.

**Com Docker Compose (recomendado — sobe com um único comando):**

```bash
cp .env.example .env   # preencha suas chaves antes de subir
docker compose up --build
```

Acesse `http://localhost:3000/docs`. Pra derrubar: `docker compose down`.

**Com Docker puro, sem compose:**

```bash
docker build -t ai-gateway-api .
docker run -p 3000:3000 --env-file .env ai-gateway-api
```

## ☁️ Deploy (Render — gratuito)

O `Dockerfile` já é suficiente para deploy em qualquer plataforma baseada
em containers. Passo a passo usando o [Render](https://render.com):

1. Crie um **Web Service** novo apontando para este repositório
2. **Environment**: Docker (o Render detecta o `Dockerfile` automaticamente)
3. Em **Environment Variables**, adicione todas as chaves do `.env.example`
   (pelo menos `GATEWAY_API_KEYS` e uma chave real de provedor —
   `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`)
4. **Health Check Path**: `/health` (o Render usa isso para saber se o
   serviço está de pé antes de rotear tráfego)
5. Deploy — a URL pública já serve o Swagger em `/docs`

> 💡 O plano gratuito do Render hiberna após 15 min sem tráfego, o que é
> aceitável para uma demo de portfólio, mas não para produção real — nesse
> caso, o plano Starter mantém o serviço sempre ativo.

## 🧠 Decisões de design

- **Token bucket em vez de janela fixa** para rate limiting: permite
  rajadas curtas de tráfego sem bloquear o usuário, mantendo um teto médio
  sustentado — mais amigável do que um contador que zera de uma vez a cada
  minuto.
- **Retry só em erros que valem a pena repetir**: 429 (rate limit) e 5xx
  (erro transitório do servidor) disparam retry; 4xx de cliente (ex: 400 de
  validação) não — tentar de novo não vai mudar o resultado.
- **Streaming via `reply.hijack()`**: o Fastify assume controle total da
  resposta HTTP para poder repassar o stream do provedor em tempo real, sem
  esperar a resposta completa antes de começar a enviar ao cliente.
- **Cache com chave determinística**: a chave é gerada a partir do corpo
  inteiro da requisição (JSON canonicalizado), então só respostas
  genuinamente idênticas são reaproveitadas.

## ⚠️ Nota sobre versões

Este projeto usa TypeScript 6.0.3 em vez do recém-lançado TypeScript 7
(compilador reescrito em Go). O motivo: no momento da criação deste
projeto, o `typescript-eslint` ainda não suporta TS 7 oficialmente (issue
de tracking). Prefiro um projeto com lint, typecheck e CI 100% funcionais a
usar a versão mais nova por si só — mas vale revisitar essa escolha quando
o ecossistema de lint alcançar o TS 7.

## ✅ Nível de prontidão

O que já está implementado e testado neste projeto:

- [x] Testes automatizados (23 testes, providers mockados, sem chamadas reais)
- [x] Docker multi-stage + `HEALTHCHECK`
- [x] Docker Compose (sobe com um comando)
- [x] CI (GitHub Actions): lint → typecheck → build → test em todo push/PR
- [x] Validação de variáveis de ambiente com Zod (falha rápido se a config estiver errada)
- [x] Documentação interativa da API (Swagger/OpenAPI em `/docs`)
- [ ] Deploy público ativo (ver seção [☁️ Deploy](#️-deploy-render--gratuito) para o passo a passo)
- [ ] Observabilidade (métricas/tracing) — ver roadmap abaixo

## 🗺️ Possíveis evoluções

- [ ] Suporte a mais provedores (Groq, Google Gemini, modelos locais via Ollama)
- [ ] Cache distribuído (Redis) para funcionar com múltiplas réplicas
- [ ] Rate limiting distribuído (hoje é em memória, por instância)
- [ ] Métricas via OpenTelemetry (latência por provedor, taxa de erro, uso de tokens)
- [ ] Roteamento automático: escolher o provedor mais barato/rápido disponível

## 📄 Licença

MIT
