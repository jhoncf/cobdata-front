# Documento de Design — CobData Front-end MVP

## Visão Geral da Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                      Navegador                           │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  React 18 + TypeScript + Vite                       │ │
│  │                                                     │ │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │ │
│  │  │  Chakra   │  │  React    │  │  TanStack      │  │ │
│  │  │  UI v3    │  │  Router   │  │  Query v5      │  │ │
│  │  └───────────┘  └───────────┘  └────────────────┘  │ │
│  │                                                     │ │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │ │
│  │  │  Zustand  │  │  Axios    │  │  React Hook    │  │ │
│  │  │  (auth)   │  │  (HTTP)   │  │  Form + Zod    │  │ │
│  │  └───────────┘  └───────────┘  └────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                               │
│                          │ HTTPS                         │
└──────────────────────────┼───────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  CobData Back-end API  │
              │  (NestJS /api)         │
              └────────────────────────┘
```


## Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Build | Vite 5 | Dev server rápido, HMR, tree-shaking nativo |
| Linguagem | TypeScript 5 strict | Segurança de tipos, DX |
| UI Framework | Chakra UI v3 | Obrigatório (requisito), acessibilidade built-in, design tokens |
| Roteamento | React Router v7 (ou TanStack Router) | Lazy loading, guards, nested routes |
| Estado servidor | TanStack Query v5 | Cache, refetch, polling, mutations |
| Estado global | Zustand | Store leve para auth/user; sem boilerplate |
| HTTP Client | Axios | Interceptors para auth, refresh queue, timeout |
| Formulários | React Hook Form + Zod | Validação schema-first, integração Chakra Field |
| CSV Parsing | papaparse | Parsing client-side de headers CSV para mapeamento de colunas na importação |
| Ícones | react-icons (Lucide) | Consistência com exemplos Chakra UI v3 |
| Testes | Vitest + Testing Library | Unitários e de integração |
| Lint/Format | ESLint + Prettier | Consistência de código |

## Estrutura de Diretórios

```
src/
├── app/                    # Ponto de entrada, providers, router
│   ├── App.tsx
│   ├── providers.tsx       # ChakraProvider, QueryClientProvider, etc.
│   └── router.tsx          # Definição de rotas
├── assets/                 # Imagens, logos
├── components/             # Componentes compartilhados
│   ├── ui/                 # Wrappers Chakra (Toaster, FileUpload, etc.)
│   ├── layout/             # AppShell, Sidebar, Header, Footer
│   └── common/             # EmptyState, ErrorBoundary, ConfirmDialog
├── features/               # Módulos de feature (domain-driven)
│   ├── auth/               # Login, Activate, ForgotPassword, ResetPassword
│   ├── users/              # Listagem, Convite, Edição
│   ├── creditors/          # CRUD credores
│   ├── wallets/            # CRUD carteiras
│   ├── contracts/          # CRUD contratos + tags
│   ├── imports/            # Upload, detalhe, erros, confirmação
│   ├── operations/         # Operações Serasa
│   └── providers/          # Configuração de provedores + mappings
├── hooks/                  # Custom hooks globais
│   ├── useAuth.ts
│   ├── usePermission.ts
│   └── usePolling.ts
├── lib/                    # Utilitários
│   ├── api.ts              # Instância Axios + interceptors
│   ├── auth.ts             # Token store, refresh queue
│   ├── constants.ts
│   └── formatters.ts       # Formatação moeda, CPF, datas
├── stores/                 # Zustand stores
│   └── authStore.ts
├── theme/                  # Customização Chakra UI
│   ├── index.ts            # createSystem config
│   ├── tokens.ts           # Cores, fontes customizadas
│   └── recipes.ts          # Receitas de componentes
├── types/                  # TypeScript types/interfaces
│   ├── api.ts              # Tipos de resposta da API
│   ├── auth.ts
│   ├── models.ts           # Creditor, Wallet, Contract, etc.
│   └── enums.ts            # Role, DebtType, ProviderStatus, etc.
└── main.tsx                # Entry point
```


## Design do Sistema de Autenticação

### Fluxo de Login e Refresh

```
┌─────────┐     POST /auth/login      ┌─────────┐
│  Login  │ ─────────────────────────► │   API   │
│  Page   │ ◄───────────────────────── │         │
└─────────┘   { accessToken }          └─────────┘
      │        + Set-Cookie: refresh         │
      │                                      │
      ▼                                      │
┌──────────────┐                             │
│  authStore   │  user = null               │
│  (Zustand)   │  accessToken em memória     │
└──────────────┘                             │
      │                                      │
      │  GET /auth/me                        │
      ▼                                      │
┌──────────────┐                             │
│  authStore   │  user = { id, email, name,  │
│  atualizado  │  role, scopes }                   │
└──────────────┘  mustResetPassword extraído  │
                  do JWT payload              │
```

### Interceptor Axios — Refresh Queue

```typescript
// Pseudocódigo do interceptor
let isRefreshing = false;
let failedQueue: { resolve, reject }[] = [];

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
      }
      isRefreshing = true;
      error.config._retry = true;
      try {
        const { accessToken } = await refreshToken();
        authStore.setToken(accessToken);
        processQueue(null, accessToken);
        return axios(error.config);
      } catch (refreshError) {
        processQueue(refreshError, null);
        authStore.logout();
        redirect('/login');
      } finally {
        isRefreshing = false;
      }
    }
    // Interceptar 403 "Password reset required" do MustResetPasswordGuard
    if (error.response?.status === 403 &&
        error.response?.data?.message?.includes('Password reset required')) {
      redirect('/change-password');
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);
```

### Proteção de Rotas

```typescript
// Componente guard
function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user.mustResetPassword) return <Navigate to="/change-password" />;
  if (roles && !roles.includes(user.role)) {
    toaster.create({ type: 'error', title: 'Acesso negado' });
    return <Navigate to="/dashboard" />;
  }
  return children;
}
```


## Design de Layout e Navegação

### AppShell (Layout Principal)

```
┌────────────────────────────────────────────────────────────┐
│  Header (h=16): Logo │ Breadcrumb │ User Menu (avatar+role)│
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│   Sidebar    │           Content Area                     │
│   (w=64)     │           (Container maxW="7xl")           │
│              │                                             │
│  - Dashboard │                                             │
│  - Credores  │                                             │
│  - Carteiras │                                             │
│  - Contratos │                                             │
│  - Imports   │                                             │
│  - Operações │                                             │
│  - Usuários* │                                             │
│  - Provedores│                                             │
│  - Sessões   │                                             │
│              │                                             │
│  *ADMIN only:│                                             │
│   Usuários   │                                             │
│  *ADMIN+OP:  │                                             │
│   Provedores │                                             │
│   Operações  │                                             │
│  *VIEWER:    │                                             │
│   Ocultar    │                                             │
│   Provedores,│                                             │
│   Usuários   │                                             │
│   Upload     │                                             │
│   (imports)  │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

- **Desktop (≥ lg)**: Sidebar fixa à esquerda, content scrollável.
- **Mobile/Tablet (< lg)**: Sidebar colapsada em Drawer ativado por ícone hambúrguer no Header.

### Mapa de Rotas

| Rota | Componente | Roles permitidos | Guard |
|------|-----------|-----------------|-------|
| `/login` | LoginPage | Público | Redirect se autenticado |
| `/activate/:token` | ActivatePage | Público | — |
| `/forgot-password` | ForgotPasswordPage | Público | — |
| `/reset-password/:token` | ResetPasswordPage | Público | — |
| `/change-password` | ChangePasswordPage | Todos (auth) | Obrigatório se mustReset |
| `/dashboard` | DashboardPage | Todos | Auth |
| `/creditors` | CreditorsListPage | Todos | Auth |
| `/creditors/:id` | CreditorDetailPage | Todos | Auth |
| `/wallets` | WalletsListPage | Todos | Auth |
| `/wallets/:id` | WalletDetailPage | Todos | Auth |
| `/contracts` | ContractsListPage | Todos | Auth |
| `/imports` | ImportsListPage | Todos | Auth |
| `/imports/new` | ImportUploadPage | ADMIN, OPERATIONAL | Auth + Role |
| `/imports/:batchId` | ImportDetailPage | Todos | Auth |
| `/operations` | OperationsListPage | Todos | Auth |
| `/operations/:id` | OperationDetailPage | Todos | Auth |
| `/users` | UsersListPage | ADMIN | Auth + Role |
| `/providers` | ProvidersPage | ADMIN, OPERATIONAL | Auth + Role |
| `/sessions` | SessionsPage | Todos | Auth |


## Design de Componentes (Chakra UI v3)

### Padrão de Tabela Paginada

Componente reutilizável `DataTable` usado em credores, carteiras, contratos, imports, operações, usuários:

```tsx
<Stack gap="4">
  {/* Toolbar: busca + filtros + botão criar */}
  <HStack justify="space-between">
    <InputGroup startElement={<LuSearch />}>
      <Input placeholder="Buscar..." />
    </InputGroup>
    <Button colorPalette="blue">+ Novo</Button>
  </HStack>

  {/* Tabela */}
  <Table.ScrollArea borderWidth="1px" rounded="md">
    <Table.Root size="sm" stickyHeader interactive>
      <Table.Header>...</Table.Header>
      <Table.Body>...</Table.Body>
    </Table.Root>
  </Table.ScrollArea>

  {/* Paginação */}
  <Pagination.Root count={total} pageSize={limit} page={page}
    onPageChange={(e) => setPage(e.page)}>
    <ButtonGroup variant="ghost" size="sm">
      <Pagination.PrevTrigger asChild><IconButton>...</IconButton></Pagination.PrevTrigger>
      <Pagination.Items render={(p) => <IconButton>...</IconButton>} />
      <Pagination.NextTrigger asChild><IconButton>...</IconButton></Pagination.NextTrigger>
    </ButtonGroup>
  </Pagination.Root>
</Stack>
```

### Padrão de Formulário Modal (Dialog)

```tsx
<Dialog.Root size={{ mdDown: "full", md: "lg" }}>
  <Dialog.Trigger asChild>
    <Button>Criar Credor</Button>
  </Dialog.Trigger>
  <Portal>
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content>
        <Dialog.Header><Dialog.Title>...</Dialog.Title></Dialog.Header>
        <Dialog.Body>
          <form onSubmit={handleSubmit(onSubmit)}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <Field.Root invalid={!!errors.name}>
                <Field.Label>Nome</Field.Label>
                <Input {...register('name')} />
                <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
              </Field.Root>
              {/* ... mais campos */}
            </SimpleGrid>
          </form>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.ActionTrigger asChild><Button variant="outline">Cancelar</Button></Dialog.ActionTrigger>
          <Button colorPalette="blue" type="submit">Salvar</Button>
        </Dialog.Footer>
        <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
```

### Padrão de Confirmação Destrutiva

```tsx
<Dialog.Root role="alertdialog">
  <Dialog.Content>
    <Dialog.Header><Dialog.Title>Confirmar exclusão</Dialog.Title></Dialog.Header>
    <Dialog.Body>Tem certeza que deseja excluir? Esta ação não pode ser desfeita.</Dialog.Body>
    <Dialog.Footer>
      <Dialog.ActionTrigger asChild><Button variant="outline">Cancelar</Button></Dialog.ActionTrigger>
      <Button colorPalette="red" onClick={onConfirm}>Excluir</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

### Padrão de Upload (Importação)

```tsx
<FileUpload.Root maxFiles={1} accept={[".csv", ".xlsx"]} maxFileSize={104857600}>
  <FileUpload.HiddenInput />
  <FileUpload.Dropzone>
    <Icon size="xl" color="fg.muted"><LuUpload /></Icon>
    <FileUpload.DropzoneContent>
      <Box>Arraste o arquivo CSV ou XLSX aqui</Box>
      <Box color="fg.muted">Máximo 100 MB</Box>
    </FileUpload.DropzoneContent>
  </FileUpload.Dropzone>
  <FileUpload.List showSize clearable />
</FileUpload.Root>
```

### Padrão de Toast (Notificações)

```tsx
// src/components/ui/toaster.tsx
export const toaster = createToaster({ placement: "bottom-end", pauseOnPageIdle: true });

// Uso
toaster.create({ type: "success", title: "Credor criado com sucesso" });
toaster.create({ type: "error", title: "Erro ao salvar", description: message });
```


## Design da Camada de Dados (TanStack Query)

### Convenções

- Cada feature expõe hooks de query/mutation:
  - `useCreditorsQuery(params)` → `useQuery`
  - `useCreateCreditorMutation()` → `useMutation` com `onSuccess` invalidando cache
- Query keys seguem padrão hierárquico: `['creditors', 'list', params]`, `['creditors', 'detail', id]`
- Polling usa `refetchInterval` do TanStack Query (ex: 5000ms para batches em progresso)
- Mutations usam `onError` para exibir toast padronizado

### Exemplo: Hook de Listagem

```typescript
// src/features/creditors/api/useCreditorsQuery.ts
export function useCreditorsQuery(params: ListCreditorsParams) {
  return useQuery({
    queryKey: ['creditors', 'list', params],
    queryFn: () => api.get('/creditors', { params }).then(r => r.data),
    placeholderData: keepPreviousData, // manter dados anteriores durante paginação
  });
}
```

### Exemplo: Hook de Mutation

```typescript
// src/features/creditors/api/useCreateCreditorMutation.ts
export function useCreateCreditorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCreditorDto) => api.post('/creditors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toaster.create({ type: 'success', title: 'Credor criado com sucesso' });
    },
    onError: (error) => handleApiError(error),
  });
}
```

### Polling para Jobs Assíncronos

```typescript
// src/features/imports/api/useImportBatchQuery.ts
export function useImportBatchQuery(batchId: string) {
  return useQuery({
    queryKey: ['imports', 'detail', batchId],
    queryFn: () => api.get(`/imports/${batchId}`).then(r => r.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const terminalStates = ['APPLIED', 'FAILED', 'CANCELLED', 'VALIDATED', 'VALIDATED_WITH_ERRORS', 'VALIDATION_FAILED'];
      return terminalStates.includes(status) ? false : 5000;
    },
  });
}
```

## Design do Tema (Chakra UI v3)

### Tokens Customizados

```typescript
// src/theme/index.ts
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#e6f2ff" },
          100: { value: "#b3d9ff" },
          500: { value: "#0066cc" },
          600: { value: "#0052a3" },
          700: { value: "#003d7a" },
          900: { value: "#001a33" },
        },
      },
    },
    semanticTokens: {
      colors: {
        "brand.solid": { value: { _light: "{colors.brand.600}", _dark: "{colors.brand.500}" } },
        "brand.fg": { value: { _light: "{colors.brand.700}", _dark: "{colors.brand.100}" } },
      },
    },
  },
  globalCss: {
    body: {
      bg: "bg",
      color: "fg",
    },
  },
});

export const system = createSystem(defaultConfig, config);
```

### Color Palette por Status

| Status | ColorPalette | Uso |
|--------|-------------|-----|
| PENDING | gray | Badge, Tag |
| VALIDATING / PROCESSING | blue | Badge + Spinner |
| VALIDATED / COMPLETED | green | Badge |
| VALIDATED_WITH_ERRORS / PARTIALLY_FAILED | orange | Badge |
| FAILED | red | Badge |
| CANCELLED | gray | Badge (variant outline) |
| REGISTERED | green | ProviderStatus / OperationItemStatus |
| UPDATED | green | ProviderStatus / OperationItemStatus |
| SENT | blue | ProviderStatus |
| WAITING_PROVIDER_EVENT | blue | OperationItemStatus |
| REMOVING | orange | ProviderStatus |
| REMOVED | gray | ProviderStatus / OperationItemStatus |
| IN_AGREEMENT | purple | ProviderStatus |
| AGREEMENT_BREACHED | red | ProviderStatus |
| PAID | teal | ProviderStatus |


## Mapeamento de Endpoints da API (contrato front-back)

### Auth

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| POST | `/api/auth/login` | ✅ LoginPage | Body: { email, password } → { accessToken } |
| POST | `/api/auth/refresh` | ✅ Interceptor | Cookie automático → { accessToken } |
| POST | `/api/auth/logout` | ✅ UserMenu | Cookie automático — resposta HTTP 204 No Content. **Nota**: endpoint é `@Public()` (não requer Bearer), identifica sessão pelo cookie. |
| POST | `/api/auth/activate` | ✅ ActivatePage | Body: { token, password } |
| POST | `/api/auth/change-password` | ✅ ChangePasswordPage | Body: { currentPassword, newPassword } |
| POST | `/api/auth/forgot-password` | ✅ ForgotPasswordPage | Body: { email } — resposta HTTP 202 |
| POST | `/api/auth/reset-password` | ✅ ResetPasswordPage | Body: { token, newPassword } |
| GET | `/api/auth/me` | ✅ Após login | → { id, email, name, role, role, scopes } — campo `mustResetPassword` disponível no JWT payload (decodificar sem verificação). P7 resolvido: `name` disponivel. |
| GET | `/api/auth/sessions` | ✅ SessionsPage | → SessionResponseDto[] com campos: id, userAgent (nullable), ipAddress (nullable), createdAt, isCurrent (boolean) |
| DELETE | `/api/auth/sessions/:id` | ✅ SessionsPage | Revogar sessão — retorna 204; 409 se tentar revogar a sessão corrente |
| DELETE | `/api/auth/sessions` | ✅ SessionsPage | Revogar todas exceto a corrente — retorna 204 |

### Users (ADMIN only)

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| POST | `/api/users/invite` | ✅ UsersPage | Body: { email, role, scopes?: string[] } |
| GET | `/api/users` | ✅ UsersPage | Query: page, limit, status? (PENDING/ACTIVE/INACTIVE) |
| PATCH | `/api/users/:id` | ✅ UsersPage | Body: { role?, isActive?: boolean, scopes?: string[] } |
| POST | `/api/users/:id/resend-invite` | ✅ UsersPage | — |
| POST | `/api/users/:id/force-reset` | ✅ UsersPage | — |

### Creditors

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| POST | `/api/creditors` | ✅ CreditorsPage | ADMIN, OPERATIONAL |
| GET | `/api/creditors` | ✅ CreditorsPage | Query: page, limit, search |
| GET | `/api/creditors/:id` | ✅ CreditorDetailPage | — |
| PATCH | `/api/creditors/:id` | ✅ CreditorsPage | ADMIN, OPERATIONAL |
| DELETE | `/api/creditors/:id` | ✅ CreditorsPage | ADMIN only |

### Wallets

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| POST | `/api/creditors/:creditorId/wallets` | ✅ WalletsPage | ADMIN, OPERATIONAL |
| GET | `/api/wallets` | ✅ WalletsPage | Query: page, limit, search |
| GET | `/api/wallets/:id` | ✅ WalletDetailPage | Inclui resumo agregado |
| PATCH | `/api/wallets/:id` | ✅ WalletsPage | ADMIN, OPERATIONAL |
| DELETE | `/api/wallets/:id` | ✅ WalletsPage | ADMIN only |

### Contracts

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| POST | `/api/contracts` | ✅ ContractsPage | ADMIN, OPERATIONAL — lógica "create or update" via deduplication key (walletId + debtorDocument + contractNumber). Retorna 201 em ambos os casos; 409 se contrato existe em outra wallet |
| GET | `/api/contracts` | ✅ ContractsPage | Filtros: walletId, creditorId, status (ContractStatus), providerStatus (ProviderStatus), dateFrom, dateTo, debtorDocument, tags[] |
| PATCH | `/api/contracts/:id` | ✅ ContractsPage | Body parcial: originalValue, updatedValue, occurrenceDate, debtType, walletId, status (ACTIVE/SUSPENDED/CANCELLED), debtOrigin, offer. Só se providerStatus é PENDING/FAILED/REMOVED — senão retorna 409. ADMIN, OPERATIONAL |
| DELETE | `/api/contracts/:id` | ✅ ContractsPage | Só se providerStatus permite (PENDING/FAILED/REMOVED) — senão 409. **ADMIN e OPERATIONAL** podem excluir |
| POST | `/api/contracts/:id/tags` | ✅ ContractsPage | Body: { tags: string[] } — retorna 200 com contrato atualizado |
| DELETE | `/api/contracts/:id/tags` | ✅ ContractsPage | Body: { tags: string[] } — retorna **HTTP 204 No Content** |
| GET | `/api/contracts/tags` | ✅ ContractsPage | Lista distinct tags + count |

### Imports

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| POST | `/api/imports` | ✅ ImportUploadPage | multipart: file + walletId + columnMapping (Record<string,string> ex: `{"col_a":"debtorDocument","col_b":"contractNumber"}`) |
| GET | `/api/imports` | ✅ ImportsListPage | Query: page, limit, status, walletId |
| GET | `/api/imports/:batchId` | ✅ ImportDetailPage | Com polling |
| GET | `/api/imports/:batchId/errors` | ✅ ImportDetailPage | Query: page, limit (max 50) |
| POST | `/api/imports/:batchId/confirm` | ✅ ImportDetailPage | ADMIN, OPERATIONAL |
| POST | `/api/imports/:batchId/cancel` | ✅ ImportDetailPage | ADMIN, OPERATIONAL |

### Operations

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| GET | `/api/operations/preview` | ✅ CreateOperationDialog | Query: walletId, action → { walletId, action, eligibleCount, batchCount } |
| POST | `/api/operations` | ✅ OperationsPage | Body: { walletId, action } — ADMIN, OPERATIONAL |
| GET | `/api/operations` | ✅ OperationsPage | Query: page, limit, walletId, status — ADMIN, OPERATIONAL, VIEWER (filtrado por scopes) |
| GET | `/api/operations/:id` | ✅ OperationDetailPage | Com polling — ADMIN, OPERATIONAL, VIEWER (filtrado por scopes) |
| POST | `/api/operations/:id/cancel` | ✅ OperationDetailPage | ADMIN, OPERATIONAL — retorna 200 sucesso; 409 se estado não permite cancelamento |

### Providers (ADMIN para escrita, ADMIN+OPERATIONAL para leitura)

| Método | Endpoint | Front-end usa | Observações |
|--------|----------|--------------|-------------|
| POST | `/api/providers` | ✅ ProvidersPage | Body: { type, environment, credentials } — ADMIN only. Retorna 409 se type já configurado (ProviderType @unique por account) |
| GET | `/api/providers` | ✅ ProvidersPage | Sem credenciais na resposta — ADMIN + OPERATIONAL |
| PATCH | `/api/providers/:id` | ✅ ProvidersPage | ADMIN only |
| POST | `/api/providers/:providerId/wallet-mappings` | ✅ ProvidersPage | Body: { walletId, externalWalletId } — ADMIN only |
| GET | `/api/providers/:providerId/wallet-mappings` | ✅ ProvidersPage | ADMIN + OPERATIONAL |
| DELETE | `/api/providers/:providerId/wallet-mappings/:mappingId` | ✅ ProvidersPage | ADMIN only — retorna **HTTP 204 No Content** |

### Endpoints NÃO consumidos pelo front-end MVP

| Endpoint | Razão |
|----------|-------|
| `POST /webhooks/serasa` | Server-to-server (provedor → back-end), autenticação via HMAC |
| `GET /health/live` | Uso de infra/monitoring (público) |
| `GET /health/ready` | Uso de infra/monitoring (público) |
| `GET /api/audit-logs` | **ADMIN only** — postergar para fase 2 (ver Pendência P9). Endpoint já implementado com filtros: action, userId, resourceType, resourceId, startDate, endDate + paginação |


## Decisões de Design

### D1: Token em memória (não localStorage)

O accessToken é armazenado exclusivamente em variável JavaScript (Zustand store sem persistência). Isso elimina acesso via XSS a tokens de sessão. O refresh token em cookie HttpOnly/Secure não é acessível por JS.

### D2: Polling vs WebSocket

No MVP, usamos polling via `refetchInterval` do TanStack Query para jobs assíncronos. WebSocket/SSE será avaliado na fase 2 caso a carga de polling se torne problemática.

### D3: Paginação server-side

Toda listagem usa paginação server-side. O front-end nunca carrega todos os registros. Parâmetros `page` e `limit` são enviados como query params. A resposta segue o formato `{ data, meta: { total, page, limit, totalPages } }`.

### D4: Validação dupla (front + back)

Formulários validam no front (Zod + React Hook Form) para UX imediata, mas a API sempre re-valida. Erros 422 da API são mapeados de volta para os campos.

### D5: Feature-based file structure

Cada domínio (creditors, wallets, etc.) tem sua própria pasta com components, hooks, api e types. Componentes compartilhados ficam em `src/components/`.

### D6: Mascaramento de dados sensíveis

O front-end confia na API para mascarar documentos de devedores para VIEWERs. O front-end não implementa lógica de mascaramento própria — renderiza o que a API retorna.

### D7: Estratégia de internacionalização

No MVP, a aplicação é 100% em português (pt-BR). i18n será adicionado em fase futura se necessário.

### D8: Modo escuro

O tema Chakra UI usa semantic tokens (bg, fg, border) que suportam light/dark automaticamente. O toggle de dark mode será disponibilizado via UserMenu no Header.

## Diagrama de Fluxo — Importação em Duas Fases

```
┌────────────┐    Upload     ┌─────────────────────┐    Job BullMQ
│  Operador  │ ────────────► │ PENDING_VALIDATION  │ ──────────────►
│            │    (POST)     └─────────────────────┘
│            │                         │
│            │                         ▼
│            │               ┌─────────────────────┐
│            │               │    VALIDATING       │ (polling 5s)
│            │               └─────────────────────┘
│            │                         │
│            │                    ┌────┼────┐
│            │                    ▼    │    ▼
│            │    ┌───────────────┐ │  │  ┌──────────────────────┐
│            │    │   VALIDATED   │ │  │  │ VALIDATED_WITH_ERRORS │
│            │    └───────────────┘ │  │  └──────────────────────┘
│            │           │          │  │          │
│            │    Confirmar (POST)  │  │   Confirmar ou Cancelar
│            │           │          │  │          │
│            │           ▼          │  ▼          ▼
│            │    ┌───────────────┐ │ ┌────────────────────┐ ┌────────────┐
│            │    │   APPLYING    │ │ │ VALIDATION_FAILED  │ │  CANCELLED │
│            │    └───────────────┘ │ └────────────────────┘ └────────────┘
│            │           │ (polling 5s)
│            │      ┌────┴────┐
│            │      ▼         ▼
│            │ ┌────────┐ ┌────────┐
│            │ │ APPLIED│ │ FAILED │
│            │ └────────┘ └────────┘
└────────────┘
```
