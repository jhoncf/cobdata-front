import { Box, Text, Flex } from '@chakra-ui/react';
import type { SearchResult, SearchResultItem as SearchResultItemType } from '../types';
import { SearchResultItem } from './SearchResultItem';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchResultsPanelProps {
  results: SearchResult | null;
  focusIndex: number;
  onSelect: (item: SearchResultItemType) => void;
  searchTerm: string;
  totalCounts?: { creditors: number; wallets: number; contracts: number };
}

// ─── Category Configuration ──────────────────────────────────────────────────

interface CategoryConfig {
  key: keyof SearchResult;
  label: string;
  type: SearchResultItemType['type'];
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'creditors', label: 'Credores', type: 'creditor' },
  { key: 'wallets', label: 'Carteiras', type: 'wallet' },
  { key: 'contracts', label: 'Contratos', type: 'contract' },
];

const MAX_ITEMS_PER_CATEGORY = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSearchResultItem(
  item: SearchResult[keyof SearchResult][number],
  type: SearchResultItemType['type'],
): SearchResultItemType {
  switch (type) {
    case 'creditor':
      return { type: 'creditor', ...(item as SearchResult['creditors'][number]) };
    case 'wallet':
      return { type: 'wallet', ...(item as SearchResult['wallets'][number]) };
    case 'contract':
      return { type: 'contract', ...(item as SearchResult['contracts'][number]) };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SearchResultsPanel({
  results,
  focusIndex,
  onSelect,
  searchTerm,
  totalCounts,
}: SearchResultsPanelProps) {
  if (!results) return null;

  const allEmpty =
    results.creditors.length === 0 &&
    results.wallets.length === 0 &&
    results.contracts.length === 0;

  // Compute flat index offset for each category
  let flatIndexOffset = 0;

  return (
    <Box
      position="absolute"
      top="100%"
      left={0}
      right={0}
      mt={1}
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      shadow="lg"
      zIndex="dropdown"
      maxH="400px"
      overflowY="auto"
      role="listbox"
      aria-activedescendant={!allEmpty ? `search-result-${focusIndex}` : undefined}
    >
      {allEmpty ? (
        <Flex justify="center" align="center" py={6} px={4}>
          <Text color="fg.muted" fontSize="sm">
            Nenhum resultado encontrado
          </Text>
        </Flex>
      ) : (
        CATEGORIES.map((category) => {
          const items = results[category.key];
          const displayedItems = items.slice(0, MAX_ITEMS_PER_CATEGORY);
          const currentOffset = flatIndexOffset;

          // Advance offset by number of displayed items for this category
          flatIndexOffset += displayedItems.length;

          if (items.length === 0) return null;

          const totalCount = totalCounts?.[category.key];
          const showTotal = totalCount !== undefined && totalCount > displayedItems.length;

          return (
            <Box key={category.key} py={1}>
              {/* Section Header */}
              <Flex
                px={3}
                py={1.5}
                align="center"
                gap={2}
              >
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase">
                  {category.label}
                </Text>
                {showTotal && (
                  <Text fontSize="xs" color="fg.muted">
                    ({totalCount} resultados)
                  </Text>
                )}
              </Flex>

              {/* Result Items */}
              {displayedItems.map((item, idx) => {
                const itemFlatIndex = currentOffset + idx;
                const isFocused = focusIndex === itemFlatIndex;
                const searchResultItem = toSearchResultItem(item, category.type);

                return (
                  <Box
                    key={item.id}
                    id={`search-result-${itemFlatIndex}`}
                    role="option"
                    aria-selected={isFocused}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={isFocused ? 'bg.emphasized' : 'transparent'}
                    outline={isFocused ? '2px solid' : 'none'}
                    outlineColor={isFocused ? 'border.accent' : undefined}
                    outlineOffset="-2px"
                    _hover={{ bg: isFocused ? 'bg.emphasized' : 'bg.subtle' }}
                    onClick={() => onSelect(searchResultItem)}
                  >
                    <SearchResultItem item={searchResultItem} searchTerm={searchTerm} />
                  </Box>
                );
              })}
            </Box>
          );
        })
      )}
    </Box>
  );
}
