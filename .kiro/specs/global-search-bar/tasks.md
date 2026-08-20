# Implementation Plan: Global Search Bar

## Overview

Implementação da busca global unificada que permite ao operador localizar Credores, Carteiras e Contratos a partir de um único campo no Header. A implementação segue a ordem: backend (DTOs/Service → Controller → Module) e depois frontend (tipos → hook → componentes UI). A linguagem é TypeScript em ambos os projetos (NestJS + React).

## Tasks

- [x] 1. Backend — DTOs e tipos do módulo de busca
  - [x] 1.1 Criar `src/search/dto/search-query.dto.ts` com validação de comprimento (3–100 chars, trim)
    - Usar `class-validator` com decorators `@IsString()`, `@MinLength(3)`, `@MaxLength(100)`, `@Transform(trim)`
    - _Requirements: 8.1, 8.6_
  - [x] 1.2 Criar `src/search/dto/search-result.dto.ts` com interfaces `CreditorSearchItem`, `WalletSearchItem`, `ContractSearchItem` e `SearchResultDto`
    - Incluir Swagger decorators para documentação da API
    - _Requirements: 8.2_

- [x] 2. Backend — SearchService com busca paralela e scope filtering
  - [x] 2.1 Criar `src/search/search.service.ts` com método `search(term, user, userScopes?)`
    - Implementar `searchCreditors()` com ILIKE por nome e LIKE por CNPJ (digits only)
    - Implementar `searchWallets()` com ILIKE por nome + join creditor
    - Implementar `searchContracts()` com SHA-256 hash match no `debtorDocumentHash`
    - Todas as queries filtradas por `accountId` e `deletedAt IS NULL`
    - Limitar 5 resultados por categoria
    - Executar queries em paralelo com `Promise.all`
    - _Requirements: 3.1, 3.2, 4.1, 5.1, 8.3, 8.4, 8.7_
  - [x] 2.2 Implementar scope filtering para VIEWER no SearchService
    - Quando `userScopes` presente, filtrar wallets por IDs no escopo
    - Filtrar creditors apenas aos que possuem wallets no escopo
    - Filtrar contracts apenas de wallets no escopo
    - _Requirements: 4.4, 8.5_
  - [ ]* 2.3 Write property tests for substring matching (Properties 4, 5, 6)
    - **Property 4: Case-insensitive substring match for creditor names**
    - **Property 5: CNPJ digit substring matching**
    - **Property 6: Case-insensitive substring match for wallet names**
    - Criar `src/search/tests/search-substring.property.spec.ts`
    - Usar fast-check com mínimo 100 iterações
    - **Validates: Requirements 3.1, 3.2, 4.1**
  - [ ]* 2.4 Write property tests for CPF hash and validation (Properties 8, 9)
    - **Property 8: CPF SHA-256 hash round-trip matching**
    - **Property 9: CPF input validation rejects invalid formats**
    - Criar `src/search/tests/search-cpf-hash.property.spec.ts`
    - **Validates: Requirements 5.1, 5.2**
  - [ ]* 2.5 Write property tests for limits and query validation (Properties 10, 12)
    - **Property 10: Maximum 5 results per category**
    - **Property 12: Query length validation**
    - Criar `src/search/tests/search-limits.property.spec.ts`
    - **Validates: Requirements 6.2, 8.3, 8.6**
  - [ ]* 2.6 Write property tests for scope isolation (Properties 7, 11)
    - **Property 7: Scope-based filtering restricts results to allowed wallets**
    - **Property 11: Account-level data isolation**
    - Criar `src/search/tests/search-isolation.property.spec.ts`
    - **Validates: Requirements 4.4, 8.4, 8.5**

- [x] 3. Backend — SearchController e Module
  - [x] 3.1 Criar `src/search/search.controller.ts` com endpoint `GET /search`
    - Aplicar `@ApiBearerAuth`, `@ApiTags('Search')`, `@ApiOperation`
    - Usar `@Query()` com `SearchQueryDto` (ValidationPipe cuida do 400)
    - Extrair `@CurrentUser()` e `userScopes` do request
    - _Requirements: 8.1, 8.6_
  - [x] 3.2 Criar `src/search/search.module.ts` e registrar no `AppModule`
    - Importar `PrismaModule`, `ProvidersModule`
    - Declarar `SearchController` e `SearchService`
    - _Requirements: 8.1_
  - [ ]* 3.3 Write unit tests for SearchController
    - Criar `src/search/search.controller.spec.ts`
    - Testar chamada ao service com parâmetros corretos
    - Testar rejeição de input inválido (< 3 chars, > 100 chars)
    - _Requirements: 8.1, 8.6_

- [x] 4. Checkpoint — Backend completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend — Tipos e API client
  - [x] 5.1 Criar `src/features/search/types.ts` com interfaces `SearchResult`, `CreditorSearchItem`, `WalletSearchItem`, `ContractSearchItem`, `SearchResultItem`, `SearchError`
    - Definir union type `SearchResultItem` com discriminador `type`
    - _Requirements: 6.1, 8.2_
  - [x] 5.2 Criar chamada API em `src/features/search/api.ts`
    - Implementar função `searchGlobal(term: string, signal?: AbortSignal)` usando Axios
    - Endpoint: `GET /search?q={term}`
    - Retornar tipo `SearchResult`
    - _Requirements: 8.1_

- [x] 6. Frontend — useGlobalSearch Hook
  - [x] 6.1 Criar `src/features/search/hooks/useGlobalSearch.ts`
    - Implementar debounce de 400ms com `setTimeout` + cleanup
    - Usar `AbortController` para cancelar requests anteriores
    - Gerenciar estados: `query`, `results`, `isLoading`, `error`
    - Não disparar busca se `query.length < 3`
    - Cancelar request em andamento ao limpar input
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 6.2 Implementar tratamento de erros no hook
    - Timeout (10s): classificar como `SearchError.type = 'timeout'`
    - 401: redirecionar para `/login` (interceptor Axios já trata)
    - 500: classificar como `SearchError.type = 'server'`
    - 429: classificar como `SearchError.type = 'rate_limit'`, auto-retry após 5s
    - Network error: classificar como `SearchError.type = 'network'`
    - Expor função `retry()` para re-executar último termo
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ]* 6.3 Write property tests for debounce behavior (Properties 1, 2, 3)
    - **Property 1: Debounce triggers exactly one request for valid input**
    - **Property 2: No search triggered for short input**
    - **Property 3: New debounce cancels in-flight request**
    - Criar `src/features/search/__tests__/properties/debounce.property.test.ts`
    - **Validates: Requirements 2.1, 2.2, 2.5**

- [x] 7. Frontend — useSearchKeyboard Hook
  - [x] 7.1 Criar `src/features/search/hooks/useSearchKeyboard.ts`
    - Gerenciar `focusIndex` com limites `[0, totalItems - 1]`
    - ArrowDown incrementa (sem wrap), ArrowUp decrementa (sem wrap)
    - Enter seleciona item no `focusIndex`
    - Escape fecha painel e retorna focus ao body
    - Não responder a ArrowUp/Down se 0 resultados
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [ ]* 7.2 Write property test for keyboard navigation bounds (Property 14)
    - **Property 14: Keyboard navigation stays within bounds**
    - Criar `src/features/search/__tests__/properties/keyboard-nav.property.test.ts`
    - **Validates: Requirements 7.1, 9.6**

- [x] 8. Frontend — SearchResultsPanel component
  - [x] 8.1 Criar `src/features/search/components/SearchResultsPanel.tsx`
    - Agrupar resultados em seções: "Credores" → "Carteiras" → "Contratos"
    - Ocultar seções sem resultados (incluindo header da seção)
    - Exibir total de matches no header quando há mais que os exibidos
    - Mostrar "Nenhum resultado encontrado" quando todas categorias vazias
    - Implementar ARIA: `role="listbox"`, `aria-activedescendant`
    - Aplicar background diferenciado no item com focus + outline de 2px
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.4, 9.6_
  - [x] 8.2 Implementar highlight de texto no `SearchResultItem`
    - Criar utility `highlightMatch(text: string, term: string): ReactNode`
    - Aplicar bold no trecho correspondente ao termo (case-insensitive)
    - Criar `src/features/search/components/SearchResultItem.tsx` diferenciado por tipo
    - Formatar CNPJ como XX.XXX.XXX/XXXX-XX, valores como BRL currency
    - _Requirements: 6.5, 3.3, 5.3, 5.4_
  - [ ]* 8.3 Write property test for text highlight (Property 13)
    - **Property 13: Text highlight matches search term**
    - Criar `src/features/search/__tests__/properties/highlight.property.test.ts`
    - **Validates: Requirements 6.5**

- [x] 9. Frontend — GlobalSearchBar component
  - [x] 9.1 Criar `src/features/search/components/GlobalSearchBar.tsx`
    - Input com placeholder "Buscar credor, carteira ou CPF..."
    - Ícone de busca à esquerda
    - `aria-label="Busca global"`
    - Registrar atalho Ctrl+K / Cmd+K (ignorar se modal aberta)
    - Spinner de loading durante requisição
    - Integrar `useGlobalSearch` e `useSearchKeyboard`
    - Renderizar `SearchResultsPanel` como dropdown
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.4_
  - [x] 9.2 Implementar responsividade (desktop expandido / mobile colapsado)
    - Desktop (≥1024px): input expandido com min-width 280px, max-width 480px
    - Mobile (<1024px): ícone 44×44px, expande ao tap para 100% width
    - Colapsar ao perder focus com input vazio (200ms delay)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 9.3 Implementar estados de erro no SearchResultsPanel
    - Mensagem "Erro ao buscar. Tente novamente." + botão retry para timeout/network
    - Mensagem "Erro interno do servidor. Tente novamente." + botão retry para 500
    - Mensagem "Muitas requisições. Aguarde um momento." para 429
    - Botão "Tentar novamente" chama `retry()` do hook
    - _Requirements: 10.1, 10.3, 10.4, 10.5_

- [x] 10. Frontend — Integração no Header e navegação
  - [x] 10.1 Integrar `GlobalSearchBar` no componente Header existente
    - Posicionar após a logo area e antes do user menu
    - Garantir que o componente está dentro do layout flex do Header
    - _Requirements: 1.1_
  - [x] 10.2 Implementar navegação ao selecionar resultado
    - Creditor: navegar para página de detalhe do credor (`/creditors/:id`)
    - Wallet: navegar para página de detalhe da carteira com contracts (`/wallets/:id`)
    - Contract: navegar para página de detalhe do contrato (`/contracts/:id`)
    - Anunciar seleção via `aria-live="assertive"`
    - Fechar painel e limpar input após navegação
    - _Requirements: 3.4, 4.3, 5.6, 7.2, 9.7_

- [ ] 11. Frontend — Testes unitários dos componentes
  - [ ]* 11.1 Write unit tests for `useGlobalSearch` hook
    - Testar debounce, cancelamento, error states, retry
    - Criar `src/features/search/__tests__/useGlobalSearch.test.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ]* 11.2 Write unit tests for `GlobalSearchBar` component
    - Testar renderização, placeholder, aria-label, Ctrl+K, responsividade
    - Criar `src/features/search/__tests__/GlobalSearchBar.test.tsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [ ]* 11.3 Write unit tests for `SearchResultsPanel` component
    - Testar categorização, highlight, navegação teclado, estados vazios e erro
    - Criar `src/features/search/__tests__/SearchResultsPanel.test.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.4_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend uses fast-check via Jest; frontend uses fast-check via Vitest
- O módulo `CryptoService` existente em `src/providers/crypto.service.ts` pode ser reutilizado para SHA-256, ou a lógica pode ser inlined usando `crypto.createHash('sha256')`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "5.2"] },
    { "id": 3, "tasks": ["3.1", "3.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 4, "tasks": ["3.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1", "6.3"] },
    { "id": 6, "tasks": ["7.2", "8.1"] },
    { "id": 7, "tasks": ["8.2", "9.1"] },
    { "id": 8, "tasks": ["8.3", "9.2", "9.3"] },
    { "id": 9, "tasks": ["10.1", "10.2"] },
    { "id": 10, "tasks": ["11.1", "11.2", "11.3"] }
  ]
}
```
