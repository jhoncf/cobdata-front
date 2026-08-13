# Documento de Requisitos — CobData Front-end MVP

## Introdução

O CobData Front-end MVP é uma aplicação SPA (Single Page Application) construída com React, TypeScript e Chakra UI v3 que consome exclusivamente a API REST do CobData Back-end (`/api`). A aplicação permite a gestão de credores, carteiras, contratos, importações em massa (CSV/XLSX) e operações Serasa, com controle de acesso baseado em papéis (ADMIN, OPERATIONAL, VIEWER). A comunicação com a API é autenticada via JWT (access token em memória, refresh token em cookie HttpOnly).

## Glossário

- **SPA**: Single Page Application — aplicação de página única com roteamento client-side
- **Chakra UI v3**: Biblioteca de componentes React utilizada (obrigatória)
- **AccessToken**: JWT de curta duração (15 min) armazenado apenas em memória (variável JS)
- **RefreshToken**: Token rotativo em cookie HttpOnly; gerenciado automaticamente pelo navegador
- **RBAC**: Role-Based Access Control — papéis ADMIN, OPERATIONAL, VIEWER
- **Scope**: Conjunto de walletIds a que um VIEWER tem acesso
- **Credor (Creditor)**: Pessoa jurídica dona de créditos
- **Carteira (Wallet)**: Agrupamento lógico de contratos vinculado a um credor
- **Contrato (Contract)**: Entidade canônica de dívida
- **ImportBatch**: Lote de importação CSV/XLSX
- **ProviderOperation**: Operação em lote enviada a um provedor (Serasa)
- **ProviderStatus**: Estado do contrato no provedor externo
- **DeduplicationKey**: Chave composta para evitar duplicação de contratos
- **Tag**: Etiqueta de texto livre vinculada a contratos
- **Toast**: Notificação inline efêmera (Chakra UI Toaster)


## Requisitos

### Requisito 1: Login e armazenamento seguro de tokens

**User Story:** Como usuário do CobData, eu quero fazer login com e-mail e senha para acessar o sistema de forma segura.

#### Critérios de Aceite

1. GIVEN a página de login, WHEN o usuário submete e-mail e senha válidos, THEN o front-end SHALL chamar `POST /api/auth/login`, armazenar o `accessToken` retornado exclusivamente em memória (variável JS, nunca em localStorage/sessionStorage) e redirecionar para o dashboard.
2. GIVEN credenciais inválidas, WHEN a API retorna 401, THEN o front-end SHALL exibir toast de erro genérico sem revelar se e-mail ou senha está incorreto.
3. GIVEN rate limit atingido (HTTP 429), WHEN a API retorna `retryAfterSeconds`, THEN o front-end SHALL desabilitar o botão de login e exibir contagem regressiva até liberação.
4. GIVEN o campo e-mail, WHEN o usuário digita, THEN o front-end SHALL validar formato de e-mail antes de habilitar o submit.
5. GIVEN o formulário de login, THEN o front-end SHALL ser acessível via teclado (Tab, Enter) com labels e roles ARIA adequados.
6. GIVEN campos vazios, WHEN o usuário tenta submeter, THEN o front-end SHALL exibir mensagens de erro inline sem chamar a API.


### Requisito 2: Renovação transparente de sessão (refresh token)

**User Story:** Como usuário autenticado, eu quero que minha sessão se renove automaticamente para não ser deslogado durante o uso normal.

#### Critérios de Aceite

1. GIVEN um accessToken expirado (ou próximo de expirar — 1 min antes), WHEN o front-end detecta expiração, THEN SHALL chamar `POST /api/auth/refresh` (cookie enviado automaticamente) e substituir o token em memória.
2. GIVEN requisições paralelas durante refresh, WHEN o refresh está em andamento, THEN o front-end SHALL enfileirar requisições pendentes e resolvê-las com o novo token (padrão queue/promise).
3. GIVEN refresh retornando 401 (token inválido/expirado), WHEN a renovação falha, THEN o front-end SHALL redirecionar para login com toast informando "Sessão expirada".
4. GIVEN logout explícito, WHEN o usuário clica em "Sair", THEN o front-end SHALL chamar `POST /api/auth/logout` e limpar o token da memória. **Nota**: o endpoint é público (`@Public()`) — não requer header Authorization; o back-end identifica a sessão pelo cookie de refresh token.

### Requisito 3: Identidade e RBAC no cliente

**User Story:** Como usuário autenticado, eu quero que a interface reflita meu papel e escopos, exibindo ou ocultando funcionalidades conforme minhas permissões.

#### Critérios de Aceite

1. GIVEN login bem-sucedido, WHEN o front-end obtém o accessToken, THEN SHALL chamar `GET /api/auth/me` para obter role e scopes e armazená-los em estado global (context/store). Adicionalmente, SHALL decodificar o payload do JWT (sem verificação de assinatura no client) para extrair o claim `mustResetPassword` e armazená-lo no estado global. **Nota**: a resposta de `GET /api/auth/me` retorna `{ id, email, name, role, scopes }` — o campo `name` está presente (P7 resolvido). O campo `mustResetPassword` está disponível no JWT payload.
2. GIVEN role VIEWER, WHEN o front-end renderiza a navegação, THEN SHALL ocultar itens de menu para Usuários e Provedores, e ocultar botões de ação de escrita (criar, editar, excluir, upload, confirmar, cancelar) em todas as telas. VIEWER pode visualizar listagens de credores, carteiras, contratos, importações e operações (filtrados por scopes no back-end).
3. GIVEN role OPERATIONAL, WHEN o front-end renderiza a navegação, THEN SHALL ocultar item de menu para Usuários. Provedores permanece visível (somente leitura — `GET /api/providers` e `GET /api/providers/:id/wallet-mappings` permitem OPERATIONAL).
4. GIVEN role ADMIN, WHEN o front-end renderiza a navegação, THEN SHALL exibir todos os itens.
5. GIVEN rota protegida acessada diretamente via URL sem permissão, THEN o front-end SHALL redirecionar para dashboard com toast "Acesso negado".
6. GIVEN um VIEWER com scopes de carteiras específicas, WHEN listagens são exibidas, THEN o back-end filtra e o front-end respeita os dados retornados (não filtra no client).


### Requisito 4: Ativação de conta e definição de senha

**User Story:** Como usuário convidado, eu quero acessar o link de ativação e definir minha senha para começar a usar o sistema.

#### Critérios de Aceite

1. GIVEN URL com token de ativação, WHEN o front-end renderiza a página, THEN SHALL exibir formulário de definição de senha com confirmação.
2. GIVEN senha fora das regras (mín. 8 chars, maiúscula, minúscula, dígito), WHEN o usuário digita, THEN SHALL exibir feedback inline de força/requisitos em tempo real.
3. GIVEN submissão válida, WHEN `POST /api/auth/activate` retorna 200, THEN SHALL redirecionar para login com toast "Conta ativada com sucesso".
4. GIVEN token expirado (API retorna 410), THEN SHALL exibir mensagem amigável com orientação para solicitar novo convite ao administrador.

### Requisito 5: Troca e recuperação de senha

**User Story:** Como usuário, eu quero alterar minha senha ou recuperá-la caso esqueça.

#### Critérios de Aceite

1. GIVEN usuário autenticado na tela de perfil, WHEN submete troca de senha (`POST /api/auth/change-password`), THEN SHALL validar regras de complexidade no front-end antes de enviar e exibir toast de sucesso ou erro.
2. GIVEN usuário com `mustResetPassword`, WHEN faz login, THEN o front-end SHALL redirecionar obrigatoriamente para tela de troca de senha, bloqueando navegação para outras rotas até a troca ser concluída. **Nota**: o back-end também enforça isso via `MustResetPasswordGuard` — retornando HTTP 403 com mensagem "Password reset required. Please change your password." para qualquer endpoint que não seja change-password. O front-end deve tratar este 403 específico como redirect para /change-password.
3. GIVEN tela de "Esqueci a senha", WHEN submete e-mail (`POST /api/auth/forgot-password`), THEN SHALL exibir mensagem genérica "Se o e-mail existir, um link será enviado" (sem vazamento). **Nota**: a API retorna HTTP 202 Accepted (não 200).
4. GIVEN URL com token de reset, WHEN renderiza página de nova senha (`POST /api/auth/reset-password`), THEN SHALL validar complexidade e redirecionar para login após sucesso.
5. GIVEN token de reset expirado (410), THEN SHALL exibir mensagem com link para solicitar novo reset.


### Requisito 6: Gestão de sessões ativas

**User Story:** Como usuário, eu quero visualizar e revogar minhas sessões ativas em outros dispositivos.

#### Critérios de Aceite

1. GIVEN tela de sessões, WHEN renderiza, THEN SHALL chamar `GET /api/auth/sessions` e exibir lista com dispositivo, IP, data e indicação de sessão corrente.
2. GIVEN sessão que não é a corrente, WHEN usuário clica "Revogar", THEN SHALL chamar `DELETE /api/auth/sessions/:sessionId` com confirmação via Dialog.
3. GIVEN botão "Revogar todas", WHEN confirmado, THEN SHALL chamar `DELETE /api/auth/sessions` e exibir toast de sucesso.
4. GIVEN tentativa de revogar sessão corrente, THEN o botão SHALL estar desabilitado com tooltip explicativo. **Nota**: caso o front-end tente revogar a sessão corrente, a API retorna 409 — tratar como fallback adicional.

### Requisito 7: Gestão de usuários (ADMIN)

**User Story:** Como administrador, eu quero convidar, listar e gerenciar usuários do sistema.

#### Critérios de Aceite

1. GIVEN role ADMIN e tela de usuários, WHEN renderiza, THEN SHALL chamar `GET /api/users` com paginação e exibir tabela com nome, e-mail, role, status e ações.
2. GIVEN formulário de convite, WHEN ADMIN submete (`POST /api/users/invite`) com e-mail, role e scopes opcionais (array de walletIds), THEN SHALL exibir toast de sucesso ou erro (409 e-mail duplicado, 422 validação).
3. GIVEN ação de editar usuário, WHEN ADMIN submete (`PATCH /api/users/:id`) alterando role/isActive/scopes, THEN SHALL atualizar lista e exibir toast. **Nota**: o DTO de atualização usa `isActive: boolean` e não um campo `status` string.
4. GIVEN ação "Reenviar convite", WHEN ADMIN confirma (`POST /api/users/:id/resend-invite`), THEN SHALL exibir toast de confirmação.
5. GIVEN ação "Forçar reset de senha", WHEN ADMIN confirma via Dialog (`POST /api/users/:id/force-reset`), THEN SHALL exibir toast.
6. GIVEN tentativa de desativar último ADMIN (API retorna 409), THEN SHALL exibir erro explicativo.


### Requisito 8: CRUD de credores

**User Story:** Como operador, eu quero cadastrar, listar, editar e excluir credores.

#### Critérios de Aceite

1. GIVEN tela de credores, WHEN renderiza, THEN SHALL chamar `GET /api/creditors` com paginação (padrão 20/página, máx 100) e busca por nome/CNPJ.
2. GIVEN formulário de criação/edição, THEN SHALL validar: nome obrigatório (1–255 chars), CNPJ opcional (14 dígitos com DV), contatos (máx 10) e endereço.
3. GIVEN submissão de criação (`POST /api/creditors`), WHEN API retorna 201, THEN SHALL fechar modal, atualizar lista e exibir toast.
4. GIVEN submissão de edição (`PATCH /api/creditors/:id`), WHEN API retorna 200, THEN SHALL atualizar registro na lista.
5. GIVEN CNPJ duplicado (API retorna 409), THEN SHALL exibir erro inline no campo CNPJ.
6. GIVEN exclusão (`DELETE /api/creditors/:id`), WHEN ADMIN confirma via Dialog, THEN SHALL remover da lista (API retorna HTTP 200 com mensagem) ou exibir erro 409 (possui wallets com contratos).
7. GIVEN role VIEWER, THEN botões de criar/editar/excluir SHALL estar ocultos.
8. GIVEN role OPERATIONAL, THEN botão de excluir SHALL estar oculto.

### Requisito 9: CRUD de carteiras

**User Story:** Como operador, eu quero criar e gerenciar carteiras vinculadas a credores.

#### Critérios de Aceite

1. GIVEN tela de carteiras, WHEN renderiza, THEN SHALL chamar `GET /api/wallets` com paginação e busca por nome.
2. GIVEN formulário de criação (`POST /api/creditors/:creditorId/wallets`), THEN SHALL validar nome (1–120 chars) e selecionar credor.
3. GIVEN detalhe de carteira (`GET /api/wallets/:id`), THEN SHALL exibir resumo agregado: total de contratos, contagem por status, soma de valores.
4. GIVEN edição de carteira (`PATCH /api/wallets/:id`), THEN SHALL permitir alterar nome e status (ACTIVE/INACTIVE).
5. GIVEN exclusão (`DELETE /api/wallets/:id`), WHEN ADMIN confirma, THEN SHALL remover (API retorna HTTP 200 com mensagem) ou exibir erro 409 (possui contratos).
6. GIVEN role VIEWER, THEN ações de escrita SHALL estar ocultas.
7. GIVEN role OPERATIONAL, THEN botão de excluir SHALL estar oculto.


### Requisito 10: Listagem e gestão de contratos

**User Story:** Como operador, eu quero listar, filtrar, criar, editar e excluir contratos de dívida.

#### Critérios de Aceite

1. GIVEN tela de contratos, WHEN renderiza, THEN SHALL chamar `GET /api/contracts` com paginação (padrão 20, máx 100) e filtros: wallet, creditor, status (ContractStatus: ACTIVE/SUSPENDED/CANCELLED), providerStatus (ProviderStatus: PENDING/SENT/REGISTERED/etc.), intervalo de datas (dateFrom/dateTo), documento do devedor, tags.
2. GIVEN role VIEWER, THEN o documento do devedor SHALL ser exibido mascarado (últimos 4 dígitos). Para ADMIN/OPERATIONAL, exibido integralmente.
3. GIVEN formulário de criação (`POST /api/contracts`), THEN SHALL validar: walletId obrigatório, documento (CPF 11 ou CNPJ 14 dígitos com DV válido), número do contrato (máx 100 chars), tipo de dívida (enum DebtType: COMMERCIAL, BANKING, SERVICES, UTILITIES, TELECOM, EDUCATION, HEALTH, CONDOMINIAL, OTHER), data de ocorrência (não futura), valor original (0.01–999999999.99). **Nota**: o endpoint implementa lógica de "create or update" via chave de deduplicação — se já existir contrato com mesma combinação (walletId + debtorDocument + contractNumber), a API atualiza o registro existente em vez de duplicar.
4. GIVEN edição (`PATCH /api/contracts/:id`), WHEN contrato tem providerStatus PENDING/FAILED/REMOVED, THEN SHALL permitir edição de: valor original, valor atualizado, data ocorrência, tipo dívida, walletId (mover contrato), status (ACTIVE/SUSPENDED/CANCELLED), origem da dívida e offer (JSON). Caso providerStatus não permita edição, exibir aviso de bloqueio.
5. GIVEN exclusão (`DELETE /api/contracts/:id`), WHEN providerStatus é PENDING/FAILED/REMOVED e ADMIN/OPERATIONAL confirma, THEN SHALL soft-delete. Retorna HTTP 200 com mensagem de sucesso; retorna 409 se providerStatus não permite.
6. GIVEN filtro por tags, THEN SHALL exibir chips de tags selecionadas e filtrar com lógica AND.
7. GIVEN ação de adicionar/remover tags (`POST/DELETE /api/contracts/:id/tags`), THEN SHALL exibir interface de tags com autocomplete a partir de `GET /api/contracts/tags`.
8. GIVEN role VIEWER, THEN ações de escrita SHALL estar ocultas.
9. GIVEN paginação, THEN o front-end SHALL exibir componente Pagination (Chakra UI) com informação de total de registros.

### Requisito 11: Importação de contratos em duas fases (upload + confirmação)

**User Story:** Como operador, eu quero importar contratos via CSV/XLSX, revisar erros e confirmar a aplicação.

#### Critérios de Aceite

1. GIVEN tela de importações, WHEN renderiza, THEN SHALL chamar `GET /api/imports` com paginação e filtros (status, wallet).
2. GIVEN formulário de upload, THEN SHALL usar componente FileUpload (Chakra UI) com dropzone, aceitar apenas .csv e .xlsx, limite de 100 MB, e exigir seleção de walletId e mapeamento de colunas.
3. GIVEN submissão (`POST /api/imports` multipart), WHEN API retorna 201, THEN SHALL exibir toast e redirecionar para detalhe do batch.
4. GIVEN detalhe do batch (`GET /api/imports/:batchId`), THEN SHALL exibir status, contadores (total, válidas, inválidas, criadas, atualizadas, ignoradas) e progresso.
5. GIVEN tabela paginada de erros (`GET /api/imports/:batchId/errors`) com limite máximo de 50 por página, THEN SHALL exibir com paginação os erros: linha, campo, código de erro e valor mascarado.
6. GIVEN batch com status VALIDATED ou VALIDATED_WITH_ERRORS, WHEN operador clica "Confirmar" (`POST /api/imports/:batchId/confirm`), THEN SHALL exibir Dialog de confirmação e, após aceite, exibir toast.
7. GIVEN batch em estado cancelável, WHEN operador clica "Cancelar" (`POST /api/imports/:batchId/cancel`), THEN SHALL confirmar via Dialog e atualizar status.
8. GIVEN batch em estado APPLYING, THEN SHALL exibir indicador de progresso (Spinner/ProgressBar) e polling periódico (5s) até transição para APPLIED ou FAILED.
9. GIVEN role VIEWER, THEN botões de upload/confirmar/cancelar SHALL estar ocultos.


### Requisito 12: Operações Serasa (criação, listagem, detalhe, cancelamento)

**User Story:** Como operador, eu quero criar operações para enviar/remover contratos no Serasa e acompanhar o progresso.

#### Critérios de Aceite

1. GIVEN tela de operações, WHEN renderiza, THEN SHALL chamar `GET /api/operations` com paginação e filtros (walletId, status).
2. GIVEN formulário de criação (`POST /api/operations`), THEN SHALL exigir seleção de wallet (mapeada a provedor) e ação (CREATE_OR_UPDATE ou REMOVE). **Pendência P4**: idealmente exibir contagem de contratos elegíveis antes de confirmar (requer endpoint ou query com filtros).
3. GIVEN operação criada (201), THEN SHALL exibir toast e redirecionar para detalhe.
4. GIVEN detalhe de operação (`GET /api/operations/:id`), THEN SHALL exibir: status geral, ação, wallet, totalItems, data de criação e lista de items com status individual (PENDING, WAITING_PROVIDER_EVENT, REGISTERED, UPDATED, REMOVED, FAILED).
5. GIVEN operação com status PENDING ou PROCESSING, WHEN operador clica "Cancelar" (`POST /api/operations/:id/cancel`), THEN SHALL confirmar via Dialog.
6. GIVEN operação em progresso, THEN SHALL usar polling (10s) para atualizar status até conclusão (COMPLETED, PARTIALLY_FAILED, FAILED, CANCELLED).
7. GIVEN role VIEWER, THEN botões de criar/cancelar SHALL estar ocultos; listagem e detalhe disponíveis (filtrados por scopes no back-end).
8. GIVEN nenhum contrato elegível (API retorna 422), THEN SHALL exibir mensagem informativa sem criar operação.

### Requisito 13: Configuração de provedores e mapeamentos (ADMIN)

**User Story:** Como administrador, eu quero configurar provedores de cobrança e mapear carteiras a IDs externos.

#### Critérios de Aceite

1. GIVEN role ADMIN e tela de provedores, WHEN renderiza, THEN SHALL chamar `GET /api/providers` e exibir lista com tipo, ambiente e quantidade de mappings. **Nota**: GET /api/providers e GET wallet-mappings permitem ADMIN e OPERATIONAL; ações de escrita (POST, PATCH, DELETE) são ADMIN only.
2. GIVEN formulário de criação (`POST /api/providers`), THEN SHALL exigir tipo (SERASA_LNOP), ambiente (HOMOLOGATION/PRODUCTION) e credenciais. Credenciais NÃO são exibidas após salvar.
3. GIVEN edição (`PATCH /api/providers/:id`), THEN SHALL permitir alterar ambiente e credenciais.
4. GIVEN wallet mappings, WHEN ADMIN abre painel de mapeamentos de um provider, THEN SHALL chamar `GET /api/providers/:id/wallet-mappings`, exibir lista e permitir criar (`POST`) ou excluir (`DELETE`) mapeamentos.
5. GIVEN role VIEWER, THEN toda a seção de provedores SHALL estar inacessível (rota protegida + menu oculto). OPERATIONAL pode visualizar listagem de providers e wallet-mappings mas não criar/editar/excluir.


### Requisito 14: Feedback de estados assíncronos (jobs e webhooks)

**User Story:** Como operador, eu quero acompanhar o progresso de importações e operações assíncronas.

#### Critérios de Aceite

1. GIVEN batch de importação em estados intermediários (PENDING_VALIDATION, VALIDATING, APPLYING), THEN o front-end SHALL usar polling periódico (5–10s) para atualizar o status e exibir indicador visual (Progress ou Spinner).
2. GIVEN operação Serasa em estados intermediários (PENDING, PROCESSING), THEN o front-end SHALL usar polling periódico (10s) para atualizar o status.
3. GIVEN transição de estado detectada via polling, THEN SHALL exibir toast informativo e atualizar a UI automaticamente.
4. GIVEN falha parcial (PARTIALLY_FAILED), THEN SHALL exibir badge/tag de atenção e permitir visualização dos itens com erro.
5. GIVEN operação ou batch FAILED, THEN SHALL exibir alerta com detalhes do erro quando disponíveis.

### Requisito 15: Tratamento de erros e respostas da API

**User Story:** Como usuário, eu quero feedback claro quando algo dá errado, sem exposição de informações técnicas.

#### Critérios de Aceite

1. GIVEN erro de rede (timeout, offline), THEN o front-end SHALL exibir toast "Falha na conexão. Verifique sua internet." sem detalhes técnicos.
2. GIVEN erro 401 em qualquer requisição (exceto refresh), THEN SHALL tentar refresh; se falhar, redirecionar para login.
3. GIVEN erro 403, THEN SHALL exibir toast "Permissão insuficiente" e não exibir dados. **Exceção**: se a mensagem é "Password reset required. Please change your password.", SHALL redirecionar para /change-password sem toast de permissão.
4. GIVEN erro 404, THEN SHALL exibir estado vazio com mensagem "Recurso não encontrado".
5. GIVEN erro 409 (conflito), THEN SHALL exibir mensagem contextual retornada pela API (ex: "CNPJ já em uso").
6. GIVEN erro 422 (validação), THEN SHALL mapear erros para campos específicos do formulário e exibir inline.
7. GIVEN erro 429 (rate limit), THEN SHALL exibir toast com tempo de espera.
8. GIVEN erro 5xx, THEN SHALL exibir toast "Erro interno. Tente novamente em instantes." sem expor stack trace.
9. GIVEN qualquer erro, THEN o front-end SHALL logar detalhes no console (dev) mas nunca exibir ao usuário final mensagens de stack, SQL ou paths internos.


### Requisito 16: Acessibilidade (WCAG 2.1 AA)

**User Story:** Como usuário com deficiência, eu quero que a interface seja navegável e compreensível usando tecnologias assistivas.

#### Critérios de Aceite

1. GIVEN toda a aplicação, THEN SHALL seguir WCAG 2.1 nível AA: contraste mínimo 4.5:1 para texto, 3:1 para componentes UI.
2. GIVEN navegação por teclado, THEN SHALL ser possível acessar todas as funcionalidades usando Tab, Shift+Tab, Enter e Escape.
3. GIVEN componentes interativos, THEN SHALL possuir focus ring visível (Chakra UI `focusRing`).
4. GIVEN formulários, THEN SHALL ter labels associadas, mensagens de erro anunciadas via `aria-live` e campos obrigatórios marcados com `aria-required`.
5. GIVEN tabelas de dados, THEN SHALL usar `<Table.Root>` com headers semânticos (`<Table.ColumnHeader>`).
6. GIVEN toasts e alertas, THEN SHALL usar `role="alert"` ou `aria-live="polite"` conforme urgência.
7. GIVEN operações destrutivas (excluir), THEN Dialog SHALL usar `role="alertdialog"` com foco automático no botão de cancelar.
8. GIVEN carregamento de dados, THEN SHALL anunciar estado de loading via `aria-busy` e spinner com `aria-label`.

### Requisito 17: Responsividade

**User Story:** Como usuário, eu quero acessar o sistema em diferentes tamanhos de tela (desktop, tablet, mobile).

#### Critérios de Aceite

1. GIVEN breakpoints Chakra UI (sm: 480px, md: 768px, lg: 992px, xl: 1280px), THEN o layout SHALL se adaptar fluidamente.
2. GIVEN telas ≥ lg, THEN SHALL exibir sidebar fixa de navegação + conteúdo principal.
3. GIVEN telas < lg, THEN SHALL colapsar sidebar em menu hambúrguer (Drawer).
4. GIVEN tabelas em telas < md, THEN SHALL usar `Table.ScrollArea` com scroll horizontal ou layout alternativo (cards).
5. GIVEN formulários, THEN campos SHALL usar `SimpleGrid` responsivo (1 coluna mobile, 2+ colunas desktop).
6. GIVEN Dialog, THEN SHALL usar `size={{ mdDown: "full", md: "lg" }}` para modais responsivos.


### Requisito 18: Segurança no navegador

**User Story:** Como equipe de segurança, eu quero que o front-end não introduza vetores de ataque comuns.

#### Critérios de Aceite

1. GIVEN accessToken, THEN SHALL ser armazenado exclusivamente em variável JavaScript em memória (nunca localStorage, sessionStorage, cookies acessíveis via JS).
2. GIVEN dados renderizados da API, THEN o front-end SHALL sanitizar output usando mecanismos nativos do React (JSX escaping) e nunca usar `dangerouslySetInnerHTML` com dados do usuário.
3. GIVEN formulários, THEN SHALL proteger contra CSRF usando SameSite cookie do refresh token (responsabilidade do back-end) + validação de origin.
4. GIVEN console de produção, THEN SHALL desabilitar source maps e não expor variáveis de ambiente sensíveis no bundle.
5. GIVEN links externos, THEN SHALL usar `rel="noopener noreferrer"` e `target="_blank"` quando necessário.
6. GIVEN dados sensíveis (documentos de devedores), THEN o front-end SHALL exibir mascarados conforme a API retorna (VIEWER) e nunca armazenar em cache persistente.
7. GIVEN interceptor HTTP, THEN SHALL incluir header `X-Requested-With: XMLHttpRequest` para proteção contra CSRF em endpoints que aceitam cookies.

### Requisito 19: Contrato com a API (convenções de integração)

**User Story:** Como desenvolvedor front-end, eu quero convenções claras de integração para consumir a API de forma consistente.

#### Critérios de Aceite

1. GIVEN base URL da API, THEN SHALL ser configurada via variável de ambiente (`VITE_API_BASE_URL`) apontando para `/api`.
2. GIVEN paginação, THEN a API retorna `{ data: T[], meta: { total, page, limit, totalPages } }` e o front-end SHALL usar esse formato uniformemente.
3. GIVEN envio de JSON, THEN SHALL usar `Content-Type: application/json` exceto para upload de arquivos (multipart/form-data).
4. GIVEN autenticação, THEN SHALL incluir header `Authorization: Bearer <accessToken>` em toda requisição autenticada.
5. GIVEN refresh token, THEN o cookie é gerenciado pelo navegador (`withCredentials: true` no client HTTP).
6. GIVEN erros da API, THEN SHALL seguir formato `{ statusCode, error, message, requestId, timestamp }` e o front-end mapeia para UI conforme Requisito 15.
7. GIVEN operações de polling, THEN SHALL usar intervalo configurável e parar ao atingir estado terminal.

## Pendências / Lacunas Identificadas

| # | Descrição | Impacto |
|---|-----------|---------|
| P1 | Endpoint `GET /api/audit-logs` existe no back-end mas **não há requisito de tela de auditoria no front-end MVP**. Decisão: postergar ou incluir? | Baixo — ADMIN-only |
| P2 | Formato exato do `columnMapping` enviado no upload de importação: é um `Record<string, string>` mapeando nomes de colunas do arquivo para campos do contrato (ex: `{ "col_a": "debtorDocument", "col_b": "contractNumber" }`). A UI de mapeamento precisa ler os headers do arquivo e apresentar selects para cada campo destino. | Médio — já parcialmente documentado via DTO |
| P3 | Não há endpoint de health check voltado ao front-end (status de conectividade com back-end). | Baixo — pode usar `/health/ready` |
| P4 | ✅ RESOLVIDO — Endpoint `GET /api/operations/preview?walletId=X&action=Y` retorna `{ walletId, action, eligibleCount, batchCount }`. Front-end deve consumir antes de criar operação. | Médio — resolvido |
| P5 | Formato da resposta de `GET /api/contracts` para VIEWER (mascaramento de documento) não está explicitamente tipado na OpenAPI — depende de serialização runtime. | Baixo — front-end consome como string |
| P6 | Webhook events não impactam o front-end diretamente (são recebidos pelo back-end). Front-end depende de polling para refletir mudanças. | Info |
| P7 | ✅ RESOLVIDO — Campo `name` adicionado à resposta de `GET /api/auth/me`. Retorna `{ id, email, name, role, scopes }`. Usar `name` no UserMenu/Header. | Médio — resolvido |
| P8 | ✅ RESOLVIDO — Campo `offer` agora tem schema formal: `OfferDto` com campos `type` (DISCOUNT/INSTALLMENT/FULL_PAYMENT), `discountPercentage`, `installments`, `installmentValue`, `totalValue`, `expiresAt`, `notes`. Validado via class-validator no back-end. | Baixo — resolvido |
| P9 | `GET /api/audit-logs` (ADMIN only) já está implementado no back-end com paginação e filtros (action, userId, resourceType, resourceId, startDate, endDate). Caso o MVP necessite de tela de auditoria, os endpoints e DTOs já existem. | Baixo — ADMIN-only, pode ser incluído como fase 2 |
| P10 | Backend usa `ContactType` enum (EMAIL, PHONE, WHATSAPP) para contatos de credores. O front-end precisa de um select com esses valores no formulário de credor. | Baixo — implementação direta |
