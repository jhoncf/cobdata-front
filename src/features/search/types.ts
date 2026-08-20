// ─── Search Result Items ─────────────────────────────────────────────────────

export interface CreditorSearchItem {
  id: string;
  name: string;
  cnpj: string;
}

export interface WalletSearchItem {
  id: string;
  name: string;
  creditorName: string;
}

export interface ContractSearchItem {
  id: string;
  contractNumber: string;
  debtorName: string;
  originalValue: number;
  updatedValue: number;
  creditorName: string;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface SearchResult {
  creditors: CreditorSearchItem[];
  wallets: WalletSearchItem[];
  contracts: ContractSearchItem[];
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type SearchResultItem =
  | ({ type: 'creditor' } & CreditorSearchItem)
  | ({ type: 'wallet' } & WalletSearchItem)
  | ({ type: 'contract' } & ContractSearchItem);

// ─── Error Handling ──────────────────────────────────────────────────────────

export interface SearchError {
  type: 'timeout' | 'network' | 'server' | 'rate_limit' | 'validation';
  message: string;
}
