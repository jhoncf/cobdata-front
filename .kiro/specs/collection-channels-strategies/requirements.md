# Requirements — Canais e Estratégias de Cobrança

## Introduction

O CobCom - CRM deve permitir configurar vários canais por carteira, acompanhar ações concorrentes e comparar sua eficiência. Inicialmente apenas Serasa estará disponível; CobCom, com modalidades de e-mail, WhatsApp e SMS, será exibido como capacidade futura quando implementado.

## Requirements

### Requirement 1: Canais por carteira

1. WHEN an ADMIN edits a wallet, THE CobCom_UI SHALL support selecting multiple collection channels, including Serasa and CobCom.
2. IN the current delivery, THE CobCom_UI SHALL display only Serasa in the selector. CobCom remains prepared for a subsequent delivery and must not trigger automatic actions.
3. THE CobCom_UI SHALL not present Banco do Brasil/Pix as a collection channel; it is a payment provider used by a channel action.

### Requirement 2: Operações e resultados concorrentes

1. WHEN an operation is created, THE CobCom_UI SHALL show the selected channels and independent result counters for each one.
2. WHEN one channel fails and another succeeds, THE CobCom_UI SHALL show the partial outcome without treating the operation as fully failed.
3. THE CobCom_UI SHALL display the action history of a contract by channel, including agreement, Pix generated and payment events when available.

### Requirement 3: Métricas e atribuição

1. THE CobCom_UI SHALL allow filtering channel metrics by wallet, strategy and date period.
2. THE CobCom_UI SHALL present payments and paid value attributed to the originating channel, separately from the payment provider.
3. WHEN a contract is moved after an agreement breach, THE CobCom_UI SHALL show the wallet transition and preserve prior channel history.
