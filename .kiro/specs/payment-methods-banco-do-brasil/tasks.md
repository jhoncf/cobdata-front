# Implementation Plan: Meios de Pagamento — Banco do Brasil

## Overview

Implementação completa do módulo de pagamentos com suporte ao Banco do Brasil como primeiro provedor. Cobre desde a modelagem de dados, passando pela abstração de provedores, emissão de cobranças (Boleto, Pix, BolePix), ciclo de vida com job de reconciliação, webhook com validação de autenticidade, settlement financeiro imutável, até permissões e auditoria.

## Tasks

- [ ] 1. Modelagem de banco de dados e migrações
  - [ ] 1.1 Criar enums e entidade PaymentGateway
    - Criar enums `PaymentProviderType` (BANCO_DO_BRASIL) e `PaymentMethod` (BOLETO, PIX, BOLEPIX)
    - Criar entidade `PaymentGateway` com campos: id, accountId, name, providerType, environment, enabled, supportedMethods, pixKey, encryptedCredentials, timeoutMs, maxRetries, createdAt, updatedAt
    - Criar índice único por (accountId, providerType, environment)
    - _Requirements: Req 1 (AC1, AC2, AC3, AC4), Req 2 (AC4, AC5)_

  - [ ] 1.2 Criar entidade PaymentCharge
    - Criar entidade com todos os campos: id, accountId, contractId, paymentGatewayId, method, status, amount, dueDate, idempotencyKey, externalId, externalStatus, ourNumber, txid, digitableLine, barcode, pixCopyPaste, qrCodeUrl, documentUrl, providerPayload, failureCode, failureMessage, issuedAt, paidAt, expiresAt, attributedChannel, createdAt, updatedAt, version (optimistic locking)
    - Criar índices: (contractId, status), (idempotencyKey, method), (status, expiresAt), (status, dueDate), (txid)
    - _Requirements: Req 4 (AC4, AC5, AC6, AC7, AC8), Req 5 (AC10, AC11), Req 6 (AC2, AC5)_

  - [ ] 1.3 Criar entidade PaymentSettlement
    - Criar entidade imutável: id, accountId, contractId, paymentChargeId (nullable), agreementReference (nullable), installmentNumber (nullable), source, status, amount (Decimal 15,2), paidAt, externalPaymentId, channelEventId, debtReference, metadata, providerPayload, createdAt
    - Criar índice único (source, externalPaymentId) para deduplicação
    - _Requirements: Req 8 (AC1, AC2, AC3, AC7, AC8)_

  - [ ] 1.4 Adicionar campos complementares ao Contract
    - Adicionar campos: debtorAddressNumber, debtorAddressComplement, debtorNeighborhood, debtorState, debtorZipCode
    - Manter compatibilidade com dados existentes (nullable)
    - _Requirements: Req 3 (AC2)_

  - [ ] 1.5 Criar entidade PaymentEvent (log de ciclo de vida)
    - Criar entidade para registrar transições de estado: id, paymentChargeId, fromStatus, toStatus, source (WEBHOOK, SYNC, JOB, MANUAL), metadata, createdAt
    - _Requirements: Req 6 (AC3), Req 9 (AC3)_

- [ ] 2. Checkpoint — Validar migrações
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Implementar módulo Payment Gateways (CRUD + segurança)
  - [ ] 3.1 Criar DTOs e validação para PaymentGateway
    - DTO de criação: name, providerType, environment, enabled, supportedMethods, credentials (clientId, clientSecret, developerKey, certificateBase64, certificatePassword, pixKey)
    - DTO de atualização parcial (PATCH)
    - DTO de resposta sem campos sensíveis (sem credentials, sem pixKey completa)
    - Validar expiração do certificado A1 no momento do cadastro
    - _Requirements: Req 1 (AC2, AC5), Req 2 (AC1, AC2, AC4, AC5)_

  - [ ] 3.2 Implementar PaymentGatewaysService
    - CRUD completo com criptografia de credenciais via CryptoService existente
    - Ativação/desativação de gateways
    - Resolver gateway padrão por (accountId, providerType, environment) quando único
    - Nunca retornar credentials em queries, logs ou erros
    - _Requirements: Req 1 (AC1, AC4, AC5), Req 2 (AC1, AC2)_

  - [ ] 3.3 Implementar PaymentGatewaysController
    - `GET /payment-gateways` — ADMIN/OPERATIONAL, sem segredos
    - `POST /payment-gateways` — ADMIN only
    - `PATCH /payment-gateways/:id` — ADMIN only
    - Aplicar RBAC com guards existentes
    - Gerar audit record em criação e alteração
    - _Requirements: Req 1 (AC1, AC5), Req 9 (AC1, AC2, AC3)_

  - [ ]* 3.4 Testes unitários para PaymentGatewaysService
    - Testar criptografia de credenciais (nunca expor em output)
    - Testar resolução de gateway padrão
    - Testar validação de certificado expirado
    - _Requirements: Req 1 (AC4, AC5), Req 2 (AC1, AC5)_

- [ ] 4. Criar abstração PaymentProviderAdapter e Factory
  - [ ] 4.1 Definir interface PaymentProviderAdapter
    - Interface com: providerType, getCapabilities(), validateIssueInput(), issue(), fetchStatus(), cancel()
    - Definir tipos: IssuePaymentChargeInput, IssuedPaymentCharge, PaymentChargeUpdate, DecryptedGatewayConfig, PaymentCapability, MissingField
    - _Requirements: Req 4 (AC3), Req 6 (AC3, AC4)_

  - [ ] 4.2 Implementar PaymentProviderFactory
    - Resolver adaptador pelo providerType registrado
    - Lançar erro claro quando adaptador não encontrado
    - Validar que o método solicitado está em supportedMethods do gateway
    - Retornar 422 se modalidade não suportada
    - _Requirements: Req 1 (AC3), Req 4 (AC3)_

  - [ ]* 4.3 Testes unitários para Factory
    - Testar resolução de adaptador existente
    - Testar erro para adaptador inexistente
    - Testar rejeição de modalidade não suportada
    - _Requirements: Req 1 (AC3), Req 4 (AC3)_

- [ ] 5. Implementar BancoDoBrasilPaymentAdapter
  - [ ] 5.1 Implementar autenticação OAuth2 + mTLS
    - OAuth2 client credentials com Application Key
    - Configurar HttpModule com certificado A1 para mTLS
    - Gerenciar token cache com renovação automática
    - Suportar ambientes de homologação e produção (URLs e escopos distintos)
    - Nunca logar Authorization header, client_secret, certificado ou token
    - _Requirements: Req 2 (AC3, AC5), Req 4 (AC8)_

  - [ ] 5.2 Implementar emissão de Pix (Cob imediata)
    - Gerar txid único no servidor
    - Montar payload conforme API Pix v2 BB (recurso `Cob`)
    - Usar pixKey do gateway como chave recebedora
    - Mapear resposta para IssuedPaymentCharge com pixCopyPaste, qrCode, txid
    - Expiração padrão 24h configurável por ambiente
    - _Requirements: Req 4 (AC4, AC7), Req 5 (AC9, AC11, AC14)_

  - [ ] 5.3 Implementar emissão de Boleto e BolePix
    - Mapear payload de boleto conforme API BB
    - Para BolePix: incluir dados Pix quando disponível
    - Retornar digitableLine, barcode, documentUrl
    - _Requirements: Req 4 (AC1, AC4)_

  - [ ] 5.4 Implementar retry com exponential backoff para HTTP 429
    - Detectar HTTP 429 e respostas de throttling
    - Calcular delay: `baseDelay × 2^(attempt - 1)` com jitter ±25%
    - Respeitar header `Retry-After` como delay mínimo quando presente
    - Max retries configurável (padrão 3, via gateway ou env)
    - Se todas tentativas exauridas: retornar failureCode `RATE_LIMITED`
    - Log estruturado: número de tentativas, delays aplicados, último status HTTP (sem auth headers)
    - _Requirements: Req 4 (AC9)_

  - [ ] 5.5 Implementar timeout por gateway e tratamento PENDING
    - Timeout configurável por PaymentGateway (padrão 30s via `PAYMENT_PROVIDER_TIMEOUT_MS`)
    - Se timeout sem resposta HTTP: retornar status `PENDING` (impossível afirmar falha)
    - Não retentar automaticamente em timeout (job reconcilia)
    - _Requirements: Req 4 (AC8)_

  - [ ] 5.6 Implementar fetchStatus para consulta de cobrança
    - Consultar status de cobrança Pix via GET Cob/{txid}
    - Consultar status de boleto via endpoint BB
    - Mapear resposta para PaymentChargeUpdate
    - _Requirements: Req 6 (AC3, AC5, AC6), Req 7 (AC3)_

  - [ ]* 5.7 Testes unitários do adaptador (HTTP mockado)
    - Testar OAuth + cache de token
    - Testar emissão Pix com resposta 201
    - Testar retry em HTTP 429 (verificar backoff delays)
    - Testar timeout gerando PENDING
    - Testar rate limit exaurido gerando FAILED/RATE_LIMITED
    - Testar fetchStatus com respostas variadas
    - _Requirements: Req 4 (AC4, AC5, AC8, AC9), Req 2 (AC3)_

- [ ] 6. Checkpoint — Validar adapter e factory
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implementar emissão e consulta de cobranças (PaymentChargesService)
  - [ ] 7.1 Implementar pré-validação de contrato
    - Validar CPF/CNPJ (formato), CEP, UF, valor positivo, data de vencimento válida
    - Retornar lista de campos faltantes sem chamar provedor
    - Endpoint preflight: `POST /contracts/:contractId/payment-charges/preflight`
    - _Requirements: Req 3 (AC1, AC2, AC3, AC4)_

  - [ ] 7.2 Implementar emissão genérica via CRM
    - `POST /contracts/:contractId/payment-charges` — ADMIN/OPERATIONAL
    - Aceitar: gateway, modalidade, valor (default do contrato), vencimento (default do contrato), idempotencyKey
    - Selecionar adaptador via Factory
    - Persistir PaymentCharge com todos os artefatos retornados
    - Garantir idempotência por (idempotencyKey, method, gatewayId)
    - Gerar audit record
    - _Requirements: Req 4 (AC1, AC2, AC3, AC4, AC5, AC6)_

  - [ ] 7.3 Implementar emissão Pix manual pelo CRM
    - `POST /contracts/:contractId/payment-charges/pix` — autenticado CRM
    - Usar `updatedValue` obrigatoriamente (rejeitar se ausente)
    - Gerar txid no servidor
    - Reutilizar Pix válido existente (open + não expirado)
    - Expiração 24h configurável
    - Channel atribuído como `COBCOM`
    - _Requirements: Req 5 (AC8, AC9, AC10, AC13, AC14)_

  - [ ] 7.4 Implementar emissão Pix por CPF para canais externos
    - `POST /payment-charges/pix/by-debtor-document` — canal autenticado
    - Receber debtorDocument (CPF/CNPJ), contractNumber, idempotencyKey
    - Normalizar documento (remover pontuação)
    - Buscar contrato elegível (ativo, com valor positivo, com data válida)
    - Zero matches → HTTP 404 sem chamar BB
    - Múltiplos matches → HTTP 409 sem chamar BB
    - Contrato inelegível (inativo, cancelado, quitado, sem valor, sem data) → rejeitar
    - Reutilizar Pix válido existente
    - Retornar apenas: chargeId, contractId, txid, amount, expiresAt, pixCopyPaste, status
    - _Requirements: Req 5 (AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC9, AC10, AC11, AC12)_

  - [ ] 7.5 Implementar listagem de cobranças por contrato
    - `GET /contracts/:contractId/payment-charges` — acesso por carteira
    - Ordenar por createdAt descendente
    - Filtrar por status opcionalmente
    - _Requirements: Req 6 (AC1), Req 9 (AC1)_

  - [ ] 7.6 Implementar sync manual de cobrança
    - `POST /payment-charges/:id/sync` — ADMIN/OPERATIONAL
    - Consultar provedor via adapter.fetchStatus()
    - Atualizar status local conforme resposta
    - Criar PaymentSettlement se provedor confirma pagamento
    - Gerar audit record
    - _Requirements: Req 7 (AC3, AC4), Req 6 (AC3)_

  - [ ]* 7.7 Testes unitários para PaymentChargesService
    - Testar pré-validação com dados incompletos
    - Testar idempotência (mesma key retorna cobrança existente)
    - Testar reuso de Pix válido
    - Testar rejeição quando updatedValue ausente
    - Testar 404/409 para busca por CPF
    - _Requirements: Req 3 (AC3, AC4), Req 4 (AC6), Req 5 (AC4, AC5, AC10)_

  - [ ]* 7.8 Testes de integração para emissão e consulta
    - Testar RBAC (VIEWER não emite, ADMIN/OPERATIONAL emitem)
    - Testar que secrets não aparecem em responses
    - Testar fluxo completo com adapter mockado
    - _Requirements: Req 9 (AC1, AC2), Req 1 (AC5)_

- [ ] 8. Checkpoint — Validar emissão e consulta
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implementar Charge Lifecycle Job (reconciliação)
  - [ ] 9.1 Criar ChargeLifecycleJob com NestJS Schedule
    - Registrar como `@Interval()` com intervalo configurável (padrão 5 min via `CHARGE_LIFECYCLE_JOB_INTERVAL_MS`)
    - Implementar leader election ou lock para execução em instância única
    - Configurar batch size (padrão 50 via `CHARGE_LIFECYCLE_JOB_BATCH_SIZE`)
    - _Requirements: Req 6 (AC5, AC6), Req 4 (AC8)_

  - [ ] 9.2 Implementar reconciliação de cobranças PENDING (timeout)
    - Buscar cobranças com status=PENDING e createdAt anterior a pendingGraceMinutes (padrão 5 min)
    - Para cada cobrança: consultar provedor via adapter.fetchStatus()
    - Se provedor confirma registro → transicionar para ISSUED, atualizar externalId
    - Se provedor confirma pagamento → transicionar para PAID, criar PaymentSettlement idempotente
    - Se provedor não conhece a cobrança → transicionar para FAILED com failureCode=PROVIDER_NOT_PROCESSED
    - Se provedor indisponível → manter status, log warning, retry no próximo ciclo
    - _Requirements: Req 4 (AC8), Req 6 (AC5, AC6)_

  - [ ] 9.3 Implementar reconciliação de cobranças vencidas
    - Buscar cobranças ISSUED/PENDING com expiresAt (Pix) ou dueDate (boleto) ultrapassados
    - Sempre consultar provedor antes de transicionar (pagamento tardio tem precedência)
    - Se provedor confirma pagamento → PAID + PaymentSettlement
    - Se provedor confirma não pago/expirado → transicionar para EXPIRED
    - Se provedor indisponível → manter status atual, log warning
    - Aplicar expiryGraceMinutes configurável (padrão 0)
    - _Requirements: Req 6 (AC5, AC6)_

  - [ ] 9.4 Implementar proteções do job
    - Optimistic locking (version/updatedAt) contra race condition com webhooks
    - Erros em cobrança individual não interrompem processamento do batch
    - Respeitar retry strategy (backoff) para consultas ao provedor dentro do job
    - Idempotência: múltiplas execuções não duplicam transições nem settlements
    - _Requirements: Req 6 (AC5, AC6), Req 4 (AC9)_

  - [ ] 9.5 Implementar observabilidade do job
    - Log estruturado por execução: processedCount, transições por tipo, erros por tipo
    - Retornar ChargeLifecycleJobResult para monitoramento
    - Alertar quando backlog PENDING > threshold configurável
    - _Requirements: Req 6 (AC5, AC6), Req 9 (AC3)_

  - [ ]* 9.6 Testes unitários para ChargeLifecycleJob
    - Testar reconciliação de PENDING → ISSUED, PAID, FAILED
    - Testar reconciliação de vencida → EXPIRED vs PAID (pagamento tardio)
    - Testar resiliência: erro em uma cobrança não afeta as demais
    - Testar idempotência: mesma execução não duplica settlement
    - Testar optimistic lock: conflito com webhook simultâneo
    - _Requirements: Req 4 (AC8), Req 6 (AC5, AC6)_

- [ ] 10. Implementar Webhook Banco do Brasil com validação de autenticidade
  - [ ] 10.1 Criar endpoint de webhook Pix BB
    - `POST /webhooks/banco-do-brasil/pix` — público, sem JWT
    - Parsear payload de confirmação Pix conforme spec BB
    - Deduplicar evento por (source=BANCO_DO_BRASIL, externalPaymentId)
    - Criar PaymentSettlement idempotente com valor e data efetivos do provedor
    - Transicionar PaymentCharge para PAID
    - _Requirements: Req 7 (AC1, AC2), Req 8 (AC1)_

  - [ ] 10.2 Implementar verificação de autenticidade do webhook
    - Validar autenticidade conforme especificação oficial BB (mTLS client certificate, IP whitelist ou signature — conforme versão da API)
    - Extrair e validar certificado do client TLS quando mTLS disponível
    - Implementar validação de IP de origem contra whitelist configurável
    - Se verificação falhar → HTTP 401, log do evento (source IP, timestamp) sem expor detalhes internos
    - Nunca processar payload de origem não autenticada
    - _Requirements: Req 7 (AC5, AC6)_

  - [ ] 10.3 Implementar processamento idempotente do webhook
    - Verificar se PaymentSettlement já existe para o externalPaymentId
    - Se já existe: retornar 200 OK sem processar novamente
    - Se não existe: criar settlement, atualizar charge, gerar audit record
    - Usar locking otimista para evitar race condition com sync manual ou job
    - _Requirements: Req 7 (AC2), Req 8 (AC1, AC2)_

  - [ ]* 10.4 Testes unitários para webhook
    - Testar payload válido → settlement criado
    - Testar payload duplicado → idempotente (200 sem duplicação)
    - Testar autenticidade inválida → 401 + log
    - Testar payload com charge não encontrada → 404 ou ignore
    - _Requirements: Req 7 (AC1, AC2, AC5, AC6)_

- [ ] 11. Checkpoint — Validar lifecycle job e webhook
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implementar Settlement financeiro e contrato canônico
  - [ ] 12.1 Definir interface PaymentSettlementEvent canônica
    - Implementar interface conforme design: provider, eventType, externalEventId, externalTransactionId, contractReference, agreementReference, installmentNumber, amount, paidAt, status, providerPayload
    - Mapear PaidAgreementEvent do Serasa → PAID_AGREEMENT
    - Mapear PaidInstallmentEvent do Serasa → PAID_INSTALLMENT
    - Mapear confirmação Pix BB → PIX_PAYMENT
    - _Requirements: Req 8 (AC7)_

  - [ ] 12.2 Implementar processador de eventos de settlement
    - Único responsável por atualizar projeções em Contract (totalPaidAmount, lastPaymentAt, paymentStatus)
    - Suportar múltiplos settlements por contrato (pagamentos parciais/installments)
    - Não liquidar contrato automaticamente, exceto quando totalPaidAmount >= agreement value
    - _Requirements: Req 8 (AC3, AC4, AC5)_

  - [ ] 12.3 Implementar registro de reversões e estornos
    - Criar PaymentSettlement com eventType=REVERSED referenciando o original
    - Nunca deletar settlement original
    - Manter providerPayload com mascaramento de PII
    - _Requirements: Req 8 (AC6, AC8)_

  - [ ] 12.4 Migrar adaptador Serasa para usar contrato canônico
    - Serasa deixa de alterar Contract diretamente
    - Publicar PaymentSettlementEvent para processamento centralizado
    - Manter campos específicos em providerPayload (sem PII/segredos)
    - _Requirements: Req 8 (AC7)_

  - [ ]* 12.5 Testes unitários para settlement e contrato canônico
    - Testar criação idempotente de settlement
    - Testar projeções de totalPaidAmount e lastPaymentAt
    - Testar que reversão não remove original
    - Testar mapeamento Serasa → canônico
    - Testar mapeamento BB Pix → canônico
    - _Requirements: Req 8 (AC1, AC2, AC3, AC6, AC7)_

- [ ] 13. Implementar permissões (RBAC) e auditoria
  - [ ] 13.1 Configurar guards de RBAC para endpoints de pagamento
    - VIEWER: apenas consultar cobranças de contratos em suas wallets
    - ADMIN/OPERATIONAL: emitir cobranças para contratos em suas wallets
    - ADMIN: gerenciar gateways
    - Canais externos: credencial com escopo `payment:pix:generate`
    - _Requirements: Req 9 (AC1, AC2)_

  - [ ] 13.2 Implementar auditoria para eventos de pagamento
    - Audit record em: criação de charge, falha, consulta externa, pagamento, cancelamento, alteração de configuração
    - Registrar: usuário responsável, recurso afetado, outcome
    - Nunca incluir PII ou secrets em metadata de auditoria
    - _Requirements: Req 9 (AC3)_

  - [ ]* 13.3 Testes de integração para RBAC
    - Testar que VIEWER não consegue emitir
    - Testar que OPERATIONAL emite para contratos em sua wallet
    - Testar que secrets não vazam em queries de VIEWER
    - _Requirements: Req 9 (AC1, AC2, AC3)_

- [ ] 14. Integração final e documentação
  - [ ] 14.1 Registrar módulo PaymentModule no AppModule
    - Wiring de controllers, services, adapters, factory, job
    - Configurar variáveis de ambiente no env.schema
    - _Requirements: Req 1 (AC3), Req 4 (AC3)_

  - [ ] 14.2 Atualizar Swagger e .env.example
    - Documentar todos os endpoints com schemas de request/response
    - Adicionar placeholders para variáveis BB no .env.example (sem valores reais)
    - _Requirements: Req 2 (AC2)_

  - [ ]* 14.3 Testes de integração end-to-end com adapter mockado
    - Fluxo completo: criar gateway → emitir Pix → webhook → settlement
    - Fluxo lifecycle: emitir → timeout → PENDING → job reconcilia
    - Fluxo rate limit: emitir → 429 → retry → sucesso ou RATE_LIMITED
    - _Requirements: Req 4 (AC4, AC8, AC9), Req 7 (AC1, AC2), Req 8 (AC1)_

- [ ] 15. Checkpoint final — Validar integração completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia os requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- O adaptador BB nunca emite cobranças reais em testes (HTTP mockado)
- Secrets nunca são logados, versionados ou expostos em responses
- O Charge_Lifecycle_Job usa locking otimista para coexistir com webhooks concorrentes
- A retry strategy com exponential backoff é aplicada tanto na emissão quanto nas consultas do job

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4", "1.5"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "4.2"] },
    { "id": 4, "tasks": ["3.3", "3.4", "4.3"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5"] },
    { "id": 7, "tasks": ["5.6", "5.7"] },
    { "id": 8, "tasks": ["7.1", "7.5"] },
    { "id": 9, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 10, "tasks": ["7.6", "7.7", "7.8"] },
    { "id": 11, "tasks": ["9.1"] },
    { "id": 12, "tasks": ["9.2", "9.3"] },
    { "id": 13, "tasks": ["9.4", "9.5", "9.6"] },
    { "id": 14, "tasks": ["10.1", "10.2"] },
    { "id": 15, "tasks": ["10.3", "10.4"] },
    { "id": 16, "tasks": ["12.1"] },
    { "id": 17, "tasks": ["12.2", "12.3", "12.4"] },
    { "id": 18, "tasks": ["12.5"] },
    { "id": 19, "tasks": ["13.1", "13.2"] },
    { "id": 20, "tasks": ["13.3"] },
    { "id": 21, "tasks": ["14.1", "14.2"] },
    { "id": 22, "tasks": ["14.3"] }
  ]
}
```
