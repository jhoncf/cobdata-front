# Checklist de Segurança no Navegador

## Status: ✅ Todos os itens abordados na implementação

### Token em memória
- [x] `accessToken` armazenado apenas em variável JavaScript (`src/lib/auth.ts`)
- [x] Nenhum uso de `localStorage.setItem` ou `sessionStorage.setItem` para tokens
- [x] Zustand store sem `persist` middleware — token perdido ao fechar aba
- [x] Refresh token em cookie `HttpOnly; Secure; SameSite=Strict` (controlado pelo back-end)

### Proteção contra XSS
- [x] Nenhum uso de `dangerouslySetInnerHTML` em todo o código-fonte
- [x] Dados do usuário renderizados via Text/Heading components (auto-escaped pelo React)
- [x] Links externos usam `rel="noopener noreferrer"` (quando aplicável)

### Header anti-CSRF
- [x] Header `X-Requested-With: XMLHttpRequest` adicionado em todas as requisições via interceptor (`src/lib/api.ts`)
- [x] `withCredentials: true` configurado na instância Axios

### Source maps em produção
- [x] `build.sourcemap: false` configurado em `vite.config.ts`
- [x] Bundle de produção não expõe código-fonte original

### Variáveis sensíveis
- [x] Apenas `VITE_API_BASE_URL` exposta no bundle (prefixo `VITE_` obrigatório pelo Vite)
- [x] Nenhuma chave de API, secret ou credencial no código client-side
- [x] `.env.local` no `.gitignore`

### Cookies
- [x] `withCredentials: true` garante envio automático de cookies em requests cross-origin
- [x] Refresh token cookie controlado pelo back-end (HttpOnly, Secure, SameSite)

---

**Nota**: Segurança completa requer análise periódica de dependências (`npm audit`), revisão de headers de resposta HTTP (CSP, HSTS) configurados no servidor/proxy, e pen-testing.
