import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Box, Button, IconButton, Input, InputGroup, Spinner, VisuallyHidden, useBreakpointValue } from '@chakra-ui/react';
import { LuSearch } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { useSearchKeyboard } from '../hooks/useSearchKeyboard';
import type { SearchResultItem } from '../types';

export function GlobalSearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Responsive: 'desktop' for ≥1024px, 'mobile' for <1024px
  const viewport = useBreakpointValue({ base: 'mobile', lg: 'desktop' }, { ssr: false }) ?? 'desktop';
  const isMobile = viewport === 'mobile';

  // Mobile expanded state
  const [isExpanded, setIsExpanded] = useState(false);

  // Aria-live announcement for screen readers
  const [announcement, setAnnouncement] = useState('');

  const { query, setQuery, results, isLoading, error, retry } = useGlobalSearch();

  // Derive open state: panel shows when we have results or an error, and query is long enough
  const isOpen = useMemo(() => {
    return query.trim().length >= 3 && (results !== null || error !== null);
  }, [query, results, error]);

  // Close the search panel by clearing the query
  const close = useCallback(() => {
    setQuery('');
  }, [setQuery]);

  // Flatten results into a single ordered list for keyboard navigation
  const flatItems = useMemo((): SearchResultItem[] => {
    if (!results) return [];
    const items: SearchResultItem[] = [];
    for (const c of results.creditors) {
      items.push({ type: 'creditor', ...c });
    }
    for (const w of results.wallets) {
      items.push({ type: 'wallet', ...w });
    }
    for (const ct of results.contracts) {
      items.push({ type: 'contract', ...ct });
    }
    return items;
  }, [results]);

  const totalItems = flatItems.length;

  // Derive display label for a search result item
  const getItemLabel = useCallback((item: SearchResultItem): string => {
    switch (item.type) {
      case 'creditor':
        return item.name;
      case 'wallet':
        return item.name;
      case 'contract':
        return item.debtorName;
    }
  }, []);

  // Navigate to the selected result
  const handleSelect = useCallback(
    (index: number) => {
      const item = flatItems[index];
      if (!item) return;

      // Announce selection to screen readers
      setAnnouncement(`Navegando para ${getItemLabel(item)}`);

      switch (item.type) {
        case 'creditor':
          navigate(`/creditors/${item.id}`);
          break;
        case 'wallet':
          navigate(`/wallets/${item.id}`);
          break;
        case 'contract':
          navigate(`/contracts/${item.id}`);
          break;
      }
      close();
    },
    [flatItems, navigate, close, getItemLabel],
  );

  const { focusIndex, handleKeyDown } = useSearchKeyboard({
    totalItems,
    onSelect: handleSelect,
    onClose: close,
    isOpen,
  });

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        // Ignore if a modal/dialog is open
        if (document.querySelector('[role="dialog"]')) {
          return;
        }
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isOpen) {
          close();
        }
        // Also collapse mobile if clicking outside with empty input
        if (isMobile && isExpanded && !query.trim()) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close, isMobile, isExpanded, query]);

  // Cleanup collapse timer on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  // Handle mobile expand on icon button tap
  const handleMobileExpand = useCallback(() => {
    setIsExpanded(true);
    // Focus input after expansion renders
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, []);

  // Handle blur on mobile: collapse after 200ms if input is empty
  const handleInputBlur = useCallback(() => {
    if (!isMobile) return;

    // Clear any existing timer
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }

    collapseTimerRef.current = setTimeout(() => {
      if (!query.trim()) {
        setIsExpanded(false);
      }
      collapseTimerRef.current = null;
    }, 200);
  }, [isMobile, query]);

  // Also expand on Ctrl+K for mobile
  useEffect(() => {
    if (isMobile) {
      const handler = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          if (document.querySelector('[role="dialog"]')) return;
          e.preventDefault();
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [isMobile]);

  // Mobile collapsed state: show only the icon button
  if (isMobile && !isExpanded) {
    return (
      <IconButton
        aria-label="Busca global"
        variant="ghost"
        size="md"
        minW="44px"
        minH="44px"
        onClick={handleMobileExpand}
      >
        <LuSearch />
      </IconButton>
    );
  }

  return (
    <Box
      ref={containerRef}
      position="relative"
      minW={isMobile ? undefined : '280px'}
      maxW={isMobile ? undefined : '480px'}
      w={isMobile ? '100%' : 'full'}
    >
      <InputGroup
        startElement={<LuSearch />}
        endElement={isLoading ? <Spinner size="xs" /> : undefined}
      >
        <Input
          ref={inputRef}
          placeholder="Buscar credor, carteira ou CPF..."
          aria-label="Busca global"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          size="sm"
          variant="outline"
          css={{
            '&:focus-visible': {
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
            },
          }}
        />
      </InputGroup>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="1"
          bg="bg"
          borderWidth="1px"
          borderColor="border"
          rounded="md"
          shadow="lg"
          zIndex="dropdown"
          maxH="400px"
          overflowY="auto"
          role="listbox"
          aria-label="Resultados da busca"
        >
          {error && (
            <Box p="3" textAlign="center" color="fg.error" fontSize="sm">
              <Box>{error.message}</Box>
              {error.type !== 'rate_limit' && (
                <Button
                  mt="2"
                  size="sm"
                  variant="ghost"
                  colorPalette="blue"
                  onClick={retry}
                >
                  Tentar novamente
                </Button>
              )}
            </Box>
          )}

          {!error && results && totalItems === 0 && (
            <Box p="3" textAlign="center" color="fg.muted" fontSize="sm">
              Nenhum resultado encontrado
            </Box>
          )}

          {!error && results && totalItems > 0 && (
            <Box p="2">
              {results.creditors.length > 0 && (
                <Box mb="2">
                  <Box px="2" py="1" fontSize="xs" fontWeight="bold" color="fg.muted">
                    Credores
                  </Box>
                  {results.creditors.map((item, idx) => {
                    const flatIdx = idx;
                    return (
                      <Box
                        key={item.id}
                        px="2"
                        py="1.5"
                        rounded="sm"
                        cursor="pointer"
                        fontSize="sm"
                        bg={focusIndex === flatIdx ? 'bg.emphasized' : undefined}
                        outline={focusIndex === flatIdx ? '2px solid' : undefined}
                        outlineColor={focusIndex === flatIdx ? 'blue.500' : undefined}
                        _hover={{ bg: 'bg.subtle' }}
                        onClick={() => handleSelect(flatIdx)}
                        id={`search-result-${flatIdx}`}
                        role="option"
                        aria-selected={focusIndex === flatIdx}
                      >
                        <Box fontWeight="medium">{item.name}</Box>
                        <Box fontSize="xs" color="fg.muted">
                          {item.cnpj}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {results.wallets.length > 0 && (
                <Box mb="2">
                  <Box px="2" py="1" fontSize="xs" fontWeight="bold" color="fg.muted">
                    Carteiras
                  </Box>
                  {results.wallets.map((item, idx) => {
                    const flatIdx = results.creditors.length + idx;
                    return (
                      <Box
                        key={item.id}
                        px="2"
                        py="1.5"
                        rounded="sm"
                        cursor="pointer"
                        fontSize="sm"
                        bg={focusIndex === flatIdx ? 'bg.emphasized' : undefined}
                        outline={focusIndex === flatIdx ? '2px solid' : undefined}
                        outlineColor={focusIndex === flatIdx ? 'blue.500' : undefined}
                        _hover={{ bg: 'bg.subtle' }}
                        onClick={() => handleSelect(flatIdx)}
                        id={`search-result-${flatIdx}`}
                        role="option"
                        aria-selected={focusIndex === flatIdx}
                      >
                        <Box fontWeight="medium">{item.name}</Box>
                        <Box fontSize="xs" color="fg.muted">
                          {item.creditorName}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {results.contracts.length > 0 && (
                <Box mb="2">
                  <Box px="2" py="1" fontSize="xs" fontWeight="bold" color="fg.muted">
                    Contratos
                  </Box>
                  {results.contracts.map((item, idx) => {
                    const flatIdx = results.creditors.length + results.wallets.length + idx;
                    return (
                      <Box
                        key={item.id}
                        px="2"
                        py="1.5"
                        rounded="sm"
                        cursor="pointer"
                        fontSize="sm"
                        bg={focusIndex === flatIdx ? 'bg.emphasized' : undefined}
                        outline={focusIndex === flatIdx ? '2px solid' : undefined}
                        outlineColor={focusIndex === flatIdx ? 'blue.500' : undefined}
                        _hover={{ bg: 'bg.subtle' }}
                        onClick={() => handleSelect(flatIdx)}
                        id={`search-result-${flatIdx}`}
                        role="option"
                        aria-selected={focusIndex === flatIdx}
                      >
                        <Box fontWeight="medium">{item.debtorName}</Box>
                        <Box fontSize="xs" color="fg.muted">
                          {item.contractNumber} · {item.creditorName}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Aria-live region for screen reader announcements on selection */}
      <VisuallyHidden>
        <div aria-live="assertive" aria-atomic="true">
          {announcement}
        </div>
      </VisuallyHidden>
    </Box>
  );
}
