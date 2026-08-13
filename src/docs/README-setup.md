# CobData Front-end — Setup e Build

## Pré-requisitos

- Node.js 18+ (recomendado: 20 LTS)
- npm 9+

## Instalação

```bash
git clone <repo-url>
cd cobdata-front
npm install
```

## Variáveis de Ambiente

Copie o arquivo de exemplo e ajuste conforme necessário:

```bash
cp .env.example .env.local
```

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITE_API_BASE_URL` | URL base da API backend | `http://localhost:3000/api` |

> **Nota**: Apenas variáveis com prefixo `VITE_` são expostas ao bundle client-side.

## Desenvolvimento Local

```bash
npm run dev
```

O servidor de desenvolvimento inicia em `http://localhost:5173`.

O proxy do Vite redireciona requisições `/api` para `http://localhost:3000` (configurável em `vite.config.ts`).

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento (Vite) |
| `npm run build` | Type-check (tsc) + build de produção (vite build) |
| `npm run preview` | Preview local do build de produção |
| `npm run lint` | Executa ESLint |
| `npm run format` | Formata código com Prettier |
| `npm run test` | Executa testes unitários (Vitest) |

## Build de Produção

```bash
npm run build
```

O build gera arquivos otimizados em `dist/`:
- TypeScript é verificado antes do build (`tsc -b`)
- Source maps desabilitados por segurança
- Tree-shaking e code-splitting automáticos (Vite)

Para servir localmente o build de produção:

```bash
npm run preview
```

## Estrutura do Projeto

```
src/
├── app/          # Providers, router, guards, ErrorBoundary
├── components/   # Componentes compartilhados (UI, layout, common)
├── features/     # Módulos por domínio (auth, creditors, wallets, etc.)
├── hooks/        # Custom hooks globais
├── lib/          # Utilitários (api, auth, formatters, jwt, constants)
├── stores/       # Zustand stores (authStore)
├── theme/        # Customização Chakra UI (tokens, recipes)
├── types/        # TypeScript types e enums
└── test/         # Setup de testes
```

## Stack Tecnológica

- **React 18** + TypeScript 5 (strict mode)
- **Vite 6** — build tool
- **Chakra UI v3** — componentes UI com acessibilidade
- **React Router v7** — roteamento SPA
- **TanStack Query v5** — gerenciamento de estado do servidor
- **Zustand** — estado global (autenticação)
- **React Hook Form + Zod** — formulários e validação
- **Vitest + Testing Library** — testes unitários

## Testes

```bash
npm run test
```

Usa Vitest com jsdom + @testing-library/react para testes de componentes.
