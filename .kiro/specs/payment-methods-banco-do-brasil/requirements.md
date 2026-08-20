# Requirements Document

## Introduction

O CobCom - CRM precisa oferecer ao operador uma experiência segura e acessível para configurar meios de pagamento e gerar cobranças vinculadas a contratos. A primeira integração visível é o Banco do Brasil, com suporte a boleto, Pix e BolePix, sem acoplar a interface a um único banco. Este documento descreve os requisitos da camada de interface (frontend) que consome a API de pagamentos do backend.

## Glossary

- **CobCom_UI**: Interface web do CobCom - CRM responsável por renderizar telas e diálogos de pagamento.
- **ADMIN**: Usuário com permissão para configurar meios de pagamento, emitir cobranças e consultar históricos.
- **OPERATIONAL**: Usuário com permissão para emitir cobranças e consultar históricos nas carteiras atribuídas.
- **VIEWER**: Usuário com permissão apenas de leitura sobre histórico de cobranças nas carteiras permitidas.
- **Payment_Gateway**: Configuração de um provedor de pagamento vinculada a uma Account, contendo nome, provedor, ambiente, modalidades habilitadas e situação.
- **Payment_Charge**: Instrução de cobrança emitida para um contrato, com valor, vencimento, modalidade e artefatos de pagamento retornados pelo provedor.
- **Preflight_Validation**: Verificação de pré-requisitos do contrato (dados do pagador, meio ativo, modalidade suportada) executada antes de permitir a emissão.
- **BolePix**: Cobrança bancária que disponibiliza simultaneamente código de barras/linha digitável e Pix QR Code.
- **Idempotency_Key**: Chave única gerada pelo frontend por tentativa de emissão, que impede cobranças duplicadas no backend.
- **Contract**: Acordo comercial que contém dados do pagador e valores base para emissão de cobranças.

## Requirements

> Nesta entrega, a geração de Pix por CPF é consumida por um canal externo autenticado. Não há nova tela de emissão no CRM; a interface administrativa e o histórico permanecem preparados para a próxima etapa.

### Requirement 1: Administração de Meios de Pagamento

**User Story:** As a ADMIN, I want to manage payment gateways through a dedicated screen, so that I can configure which providers and payment methods are available for charge issuance without exposing sensitive credentials.

#### Acceptance Criteria

1. WHEN the ADMIN navigates to the administrative section, THE CobCom_UI SHALL display a "Meios de pagamento" menu item accessible only to ADMIN users.
2. THE CobCom_UI SHALL render a list of Payment_Gateway records showing name, provider, environment, enabled payment methods and activation status.
3. THE CobCom_UI SHALL never render stored credentials, tokens or certificates in the list, detail view or any other screen element.
4. WHEN an ADMIN opens the Payment_Gateway form, THE CobCom_UI SHALL display only the credential fields required by the selected provider type, with secret fields using password-masked inputs.
5. WHEN a Payment_Gateway is saved and the screen reloads, THE CobCom_UI SHALL display a "credential configured" indicator without revealing the stored secret values.
6. THE CobCom_UI SHALL allow ADMIN to create, edit, activate and deactivate a Banco do Brasil Payment_Gateway configuration.

### Requirement 2: Emissão de Cobrança no Contrato

**User Story:** As a ADMIN or OPERATIONAL user, I want to issue a charge from an eligible contract, so that I can collect payments from debtors through the configured provider using the appropriate payment method.

#### Acceptance Criteria

1. WHEN an eligible contract is viewed, THE CobCom_UI SHALL display a "Gerar cobrança" action visible to ADMIN and OPERATIONAL users.
2. WHEN the charge dialog opens, THE CobCom_UI SHALL allow selection of payment gateway, payment method (Boleto, Pix, BolePix), amount and due date.
3. WHEN the contract has amount and due date data available, THE CobCom_UI SHALL pre-fill those fields in the charge dialog, requiring explicit user confirmation before submission.
4. WHEN the charge dialog opens and before submission, THE CobCom_UI SHALL execute the Preflight_Validation and highlight the contract fields that need correction, displaying user-friendly field names and a call-to-action button that redirects the user to the contract edit form.
5. WHILE the Preflight_Validation identifies missing or invalid contract data, THE CobCom_UI SHALL disable the submission button and prevent charge issuance.
6. WHILE the contract is incomplete, the payment gateway is inactive or no supported payment method exists, THE CobCom_UI SHALL prevent the charge emission and display an appropriate message.
7. WHILE a charge submission request is in progress, THE CobCom_UI SHALL disable the submission button and display a loading indicator to prevent duplicate requests.
8. WHEN the submission button is clicked, THE CobCom_UI SHALL generate a unique Idempotency_Key for the current attempt and include it in the API request.
9. WHEN an ADMIN or OPERATIONAL user views a contract in the listing, THE CobCom_UI SHALL provide a "Gerar Pix" action that emits a Pix for that contract and displays the copy-and-paste code.
10. WHEN a Pix is open and valid for a contract, THE CobCom_UI SHALL display the existing Pix instead of offering a duplicate emission.

### Requirement 3: Resultado da Emissão e Resposta Parcial do Provedor

**User Story:** As a ADMIN or OPERATIONAL user, I want to see only the payment artifacts actually returned by the provider, so that I have accurate information without confusion about unavailable data.

#### Acceptance Criteria

1. WHEN the charge issuance succeeds, THE CobCom_UI SHALL display the charge status and only the artifacts returned by the provider: digitable line, barcode, Pix copy-and-paste code, QR Code, URL/PDF or external reference.
2. WHEN the provider returns a partial response (e.g., boleto generated but Pix unavailable in a BolePix charge), THE CobCom_UI SHALL render only the available artifacts without displaying error indicators or placeholder content for the non-returned artifacts.
3. THE CobCom_UI SHALL not render fields or sections for payment artifacts that were not included in the provider response.
4. WHEN the user clicks a copy action for Pix copy-and-paste code or digitable line, THE CobCom_UI SHALL provide accessible feedback indicating success or failure of the copy operation.

### Requirement 4: Histórico de Cobranças e Atualização de Status

**User Story:** As a ADMIN or OPERATIONAL user, I want to view the charge history for a contract and refresh the status, so that I can monitor payment collection progress with up-to-date information.

#### Acceptance Criteria

1. THE CobCom_UI SHALL display a charge history for each contract, showing payment method, amount, due date, status, creation date and external identifier when available.
2. THE CobCom_UI SHALL order the charge history list by creation date in descending order (most recent first).
3. WHEN the user clicks the "Atualizar status" button in the charge history, THE CobCom_UI SHALL request the current charge statuses from the backend API and refresh the displayed list with updated data.
4. WHEN the charge history screen is loaded or reloaded, THE CobCom_UI SHALL fetch the latest charge statuses from the backend API.
5. THE CobCom_UI SHALL not implement WebSocket or Server-Sent Events for real-time status updates in this delivery; status refresh relies exclusively on manual user action or page reload.
6. WHEN a payment is confirmed, THE CobCom_UI SHALL display the paid amount and effective payment date from the settlement record, distinguishing partial payments from full settlement of the contract.
7. THE CobCom_UI SHALL provide a "Ressincronizar pagamento" action for authorized internal users to request the current charge status from the Banco do Brasil.

### Requirement 5: Comportamento Após Erro na Emissão

**User Story:** As a ADMIN or OPERATIONAL user, I want clear and actionable error feedback after a charge emission failure, so that I can understand what went wrong and retry the operation without confusion.

#### Acceptance Criteria

1. IF the charge issuance API returns an error, THEN THE CobCom_UI SHALL display a user-friendly, non-technical error message describing the failure in accessible language.
2. IF the charge issuance fails, THEN THE CobCom_UI SHALL re-enable the submission button to allow the user to retry the operation.
3. THE CobCom_UI SHALL not display raw HTTP status codes, stack traces, provider error payloads or internal error identifiers to the user.
4. WHEN an error message is displayed, THE CobCom_UI SHALL ensure the message is announced to assistive technologies (screen readers) using appropriate ARIA attributes.
5. IF a support reference identifier is available in the error response, THEN THE CobCom_UI SHALL include it in the error message so the user can reference it when contacting support.

### Requirement 6: Permissões e Segurança da Interface

**User Story:** As a ADMIN, I want the UI to enforce role-based visibility and protect sensitive data, so that users only see actions they are authorized to perform and no credentials are leaked through the browser.

#### Acceptance Criteria

1. WHILE a user has VIEWER role, THE CobCom_UI SHALL display charge history for permitted wallets but hide emission and configuration actions.
2. WHILE a user lacks permission for an action, THE CobCom_UI SHALL hide the corresponding UI element rather than showing a disabled state.
3. IF the backend returns HTTP 403 for an attempted action, THEN THE CobCom_UI SHALL display a clear access-denied message and remove the unauthorized action from the interface.
4. THE CobCom_UI SHALL never store credentials, tokens, certificates or integration logs in browser-persisted state (localStorage, sessionStorage, IndexedDB), telemetry payloads or user-visible messages.
