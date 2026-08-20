# Requirements Document

## Introduction

Campo de busca global na barra superior (Header) do CobData que permite ao usuário localizar rapidamente Credores, Carteiras e Contratos por CPF do devedor. A busca unificada consolida três domínios em um único ponto de acesso, reduzindo a navegação entre telas e acelerando o fluxo operacional diário.

## Glossary

- **Search_Bar**: Componente de input de busca global posicionado no Header da aplicação
- **Search_Service**: Endpoint de backend que recebe o termo de busca e retorna resultados categorizados
- **Creditor**: Entidade representando um credor (pessoa jurídica com nome e CNPJ)
- **Wallet**: Carteira associada a um credor, contendo contratos de dívida
- **Contract**: Contrato de dívida vinculado a uma carteira, identificado pelo CPF do devedor (debtorDocument)
- **CPF**: Cadastro de Pessoa Física — documento de 11 dígitos que identifica um devedor
- **CNPJ**: Cadastro Nacional de Pessoa Jurídica — documento de 14 dígitos que identifica um credor
- **Search_Results_Panel**: Painel dropdown que exibe os resultados da busca categorizados por tipo
- **Debounce**: Técnica que atrasa a execução da busca até o usuário parar de digitar por um período configurável

## Requirements

### Requirement 1: Exibição do Campo de Busca Global

**User Story:** As an operator, I want a search bar always visible in the top navigation, so that I can quickly search across the platform without navigating to different pages.

#### Acceptance Criteria

1. THE Search_Bar SHALL be rendered inside the Header component, positioned horizontally after the logo area and before the user menu, with a minimum width of 280px and a maximum width of 480px
2. THE Search_Bar SHALL display a placeholder text "Buscar credor, carteira ou CPF..."
3. THE Search_Bar SHALL include a search icon (magnifying glass) positioned to the left of the text input area as visual affordance
4. THE Search_Bar SHALL support keyboard shortcut Ctrl+K (or Cmd+K on macOS) to move focus to the input field, regardless of which element currently holds focus on the page
5. WHEN the Search_Bar receives focus, THE Search_Bar SHALL visually indicate the active state by displaying a border with a minimum contrast ratio of 3:1 against the surrounding background
6. THE Search_Bar SHALL include an accessible label (aria-label) with the value "Busca global" so that screen readers can identify the input purpose
7. IF the keyboard shortcut Ctrl+K (or Cmd+K) is pressed while a modal or dialog is open, THEN THE Search_Bar SHALL not capture focus and the shortcut SHALL be ignored

### Requirement 2: Disparar Busca com Debounce

**User Story:** As an operator, I want the search to trigger automatically after I stop typing, so that I get results without pressing a button while not overloading the server.

#### Acceptance Criteria

1. WHEN the user types at least 3 characters (and no more than 100 characters) in the Search_Bar and no further keystroke occurs within 400ms, THE Search_Service SHALL be called exactly once with the current input value
2. WHILE the user has typed fewer than 3 characters, THE Search_Bar SHALL NOT trigger a request to the Search_Service
3. WHEN the user clears the Search_Bar input, THE Search_Results_Panel SHALL close and any in-flight request to the Search_Service SHALL be cancelled
4. WHILE a search request is in progress, THE Search_Bar SHALL display a loading spinner indicator; IF the request does not complete within 10 seconds, THEN THE Search_Bar SHALL hide the spinner and display an error message indicating timeout
5. IF a new debounce cycle completes while a previous Search_Service request is still in-flight, THEN THE Search_Bar SHALL cancel the previous request before dispatching the new one
6. IF the Search_Service request fails due to network or server error, THEN THE Search_Bar SHALL hide the loading spinner and display an error message indicating the failure, preserving the user's current input text

### Requirement 3: Busca de Credores

**User Story:** As an operator, I want to find creditors by name or CNPJ, so that I can navigate directly to a creditor's profile.

#### Acceptance Criteria

1. WHEN the user searches by a term of at least 3 characters matching a creditor name, THE Search_Service SHALL return creditors whose name contains the search term using case-insensitive substring matching
2. WHEN the user searches by a term of at least 3 characters matching a full or partial CNPJ (digits only, ignoring any formatting), THE Search_Service SHALL return creditors whose CNPJ contains the search term using case-insensitive substring matching
3. THE Search_Results_Panel SHALL display each creditor result with the creditor name and CNPJ formatted as XX.XXX.XXX/XXXX-XX
4. WHEN the user selects a creditor result, THE application SHALL navigate to the creditor detail page
5. IF no creditors match the search term, THEN THE Search_Results_Panel SHALL display an empty-state message indicating no creditors were found

### Requirement 4: Busca de Carteiras

**User Story:** As an operator, I want to find wallets by name, so that I can navigate directly to the wallet screen showing its contracts.

#### Acceptance Criteria

1. WHEN the user searches by a term of at least 3 characters that is contained within a wallet name (case-insensitive substring match), THE Search_Service SHALL return the matching wallets in the results
2. THE Search_Results_Panel SHALL display each wallet result with the wallet name and the associated creditor name, ordered by wallet name ascending
3. WHEN the user selects a wallet result, THE application SHALL navigate to the wallet detail page with the contracts list visible as the initial view
4. IF the search term matches wallet names but all matching wallets belong to scopes the user does not have access to, THEN THE Search_Results_Panel SHALL NOT display any wallet results for that term

### Requirement 5: Busca de Contratos por CPF

**User Story:** As an operator, I want to find contracts by debtor CPF, so that I can quickly access debt information for a specific person.

#### Acceptance Criteria

1. WHEN the user submits a search with a complete CPF (11 numeric digits) in the debtorDocument filter field, THE Search_Service SHALL return all contracts whose debtorDocumentHash matches the SHA-256 hash of the provided CPF, within 2 seconds
2. IF the user submits a search with fewer than 11 numeric digits or with non-numeric characters in the debtorDocument field, THEN THE Search_Service SHALL return a validation error indicating that a complete valid CPF is required
3. WHEN there is exactly one contract matching the CPF, THE Search_Results_Panel SHALL display the contract showing: debtor name, debtor document, original value (formatted as BRL currency), updated value (formatted as BRL currency), contract number, and creditor name (resolved via wallet)
4. WHEN there are multiple contracts matching the CPF, THE Search_Results_Panel SHALL display a list of contracts (maximum 5 in the dropdown), each showing: debtor name, original value (formatted as BRL currency), updated value (formatted as BRL currency), contract number, and creditor name (resolved via wallet)
5. IF no contracts match the provided CPF, THEN THE Search_Results_Panel SHALL display an empty state message indicating that no contracts were found for the given document
6. WHEN the user selects a contract row from the search results, THE application SHALL navigate to the contract detail page using the contract's unique identifier

### Requirement 6: Categorização e Apresentação dos Resultados

**User Story:** As an operator, I want search results grouped by category, so that I can quickly identify the type of each result and choose the right one.

#### Acceptance Criteria

1. THE Search_Results_Panel SHALL group results into three sections displayed in fixed order: "Credores" first, "Carteiras" second, and "Contratos" third
2. THE Search_Results_Panel SHALL display a maximum of 5 results per category, and WHEN a category contains more results than displayed, THE Search_Results_Panel SHALL show the total count of matches for that category in the section header
3. WHEN a category has no results, THE Search_Results_Panel SHALL hide that category section entirely, including its header
4. WHEN no results are found across all categories, THE Search_Results_Panel SHALL display a "Nenhum resultado encontrado" message as the only content of the panel
5. THE Search_Results_Panel SHALL highlight the matched text portion within each result item using bold font weight to visually distinguish it from non-matched text

### Requirement 7: Navegação por Teclado nos Resultados

**User Story:** As an operator, I want to navigate search results using my keyboard, so that I can select results without using the mouse.

#### Acceptance Criteria

1. WHEN the Search_Results_Panel opens with at least one result, THE Search_Bar SHALL set the focus index to the first result item and allow the user to move the focus index down with the ArrowDown key and up with the ArrowUp key, stopping at the last and first items respectively without wrapping
2. WHEN the user presses Enter while a result item holds the focus index, THE application SHALL navigate to the detail page of the entity represented by that result item
3. WHEN the user presses Escape while the Search_Results_Panel is open, THE Search_Results_Panel SHALL close and THE Search_Bar SHALL return focus to the document body
4. WHILE a result item holds the focus index, THE Search_Results_Panel SHALL display that item with a visible background color distinct from non-focused items and a 2px outline indicator
5. IF the Search_Results_Panel opens with zero results, THEN THE Search_Bar SHALL not respond to ArrowUp or ArrowDown key presses

### Requirement 8: Endpoint de Busca Unificada no Backend

**User Story:** As a frontend developer, I want a single API endpoint that searches across creditors, wallets, and contracts, so that the frontend makes a single request for each search.

#### Acceptance Criteria

1. THE Search_Service SHALL expose a GET endpoint at /search with a query parameter "q" for the search term, accepting between 3 and 100 characters after trimming whitespace
2. THE Search_Service SHALL return results structured as { creditors: [], wallets: [], contracts: [] }, where each item contains at minimum its id and display label (name for creditors and wallets, contractNumber for contracts)
3. THE Search_Service SHALL limit results to a maximum of 5 items per category
4. THE Search_Service SHALL filter results by the authenticated user's accountId
5. WHILE the user has VIEWER role with scoped wallets, THE Search_Service SHALL restrict results to wallets within the user's allowed scopes, creditors that own those wallets, and contracts belonging to those wallets
6. IF the "q" parameter after trimming is fewer than 3 characters or exceeds 100 characters, THEN THE Search_Service SHALL return a 400 Bad Request response with an error message indicating the allowed length range
7. THE Search_Service SHALL perform case-insensitive partial matching against creditor name, wallet name, and contract number or debtor name
8. IF no results match across any category, THEN THE Search_Service SHALL return a 200 response with empty arrays in all three categories

### Requirement 9: Responsividade e Acessibilidade

**User Story:** As an operator using different devices, I want the search bar to adapt to my screen size, so that I can search effectively on both desktop and mobile.

#### Acceptance Criteria

1. WHILE the viewport is at desktop width (≥1024px), THE Search_Bar SHALL display as an expanded input field with minimum width of 280px and maximum width of 480px
2. WHILE the viewport is at mobile width (<1024px), THE Search_Bar SHALL display as a collapsed icon button with minimum touch target of 44×44px
3. WHEN the operator taps the collapsed Search_Bar icon button, THE Search_Bar SHALL expand to 100% of its parent container width and place focus in the input field
4. IF the expanded mobile Search_Bar input loses focus and the input value is empty, THEN THE Search_Bar SHALL collapse back to the icon button state within 200ms
5. THE Search_Bar SHALL have an accessible label "Busca global" associated via aria-label for screen readers
6. THE Search_Results_Panel SHALL have ARIA role "listbox" and SHALL update aria-activedescendant to reference the id of the currently highlighted option when the operator navigates with Arrow Up or Arrow Down keys
7. WHEN a result is selected via Enter key, THE application SHALL announce the selected result text to screen readers via an aria-live region with politeness level "assertive"
8. WHEN the operator presses Escape while the Search_Results_Panel is open, THE Search_Results_Panel SHALL close and return focus to the Search_Bar input

### Requirement 10: Tratamento de Erros

**User Story:** As an operator, I want to see clear feedback when the search fails, so that I know what happened and can try again.

#### Acceptance Criteria

1. IF the Search_Service does not respond within 10 seconds or the network connection fails, THEN THE Search_Results_Panel SHALL replace any loading indicator with the message "Erro ao buscar. Tente novamente." and display a "Tentar novamente" button
2. IF the Search_Service returns a 401 Unauthorized response, THEN THE application SHALL clear the Search_Bar input and redirect to the login page within 1 second
3. IF the Search_Service returns a 500 Internal Server Error, THEN THE Search_Results_Panel SHALL display the message "Erro interno do servidor. Tente novamente." and display a "Tentar novamente" button
4. WHEN the user activates the "Tentar novamente" button, THE Search_Service SHALL be called again with the same search term that was present in the Search_Bar at the time of the error
5. IF the Search_Service returns a 429 Too Many Requests response, THEN THE Search_Results_Panel SHALL display the message "Muitas requisições. Aguarde um momento." and automatically retry the request after 5 seconds