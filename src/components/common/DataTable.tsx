import { Table, Skeleton, Box, Button, HStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { LuArrowDown, LuArrowUp } from 'react-icons/lu';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  textAlign?: 'start' | 'center' | 'end';
  minW?: string;
  /** Field sent to the API when this column is selected for sorting. */
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  skeletonRows?: number;
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (sortKey: string) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  keyExtractor,
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  return (
    <Box
      borderWidth="1px"
      rounded="xl"
      overflow="hidden"
      maxW="full"
      bg="card.bg"
      shadow="xs"
    >
      <Table.ScrollArea>
        <Table.Root size="sm" stickyHeader interactive={!!onRowClick} minW="max-content">
          <Table.Header>
            <Table.Row>
              {columns.map((col) => (
                <Table.ColumnHeader
                  key={col.key}
                  textAlign={col.textAlign}
                  minW={col.minW}
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="fg.muted"
                  py="3"
                >
                  {col.sortKey && onSort ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      px="0"
                      minW="0"
                      h="auto"
                      fontSize="inherit"
                      fontWeight="inherit"
                      textTransform="inherit"
                      letterSpacing="inherit"
                      color="inherit"
                      onClick={() => onSort(col.sortKey!)}
                      aria-label={`Ordenar por ${col.header}`}
                    >
                      <HStack gap="1">
                        <Box as="span">{col.header}</Box>
                        {sortBy === col.sortKey && (
                          sortDirection === 'asc' ? <LuArrowUp /> : <LuArrowDown />
                        )}
                      </HStack>
                    </Button>
                  ) : col.header}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, idx) => (
                  <Table.Row key={`skeleton-${idx}`}>
                    {columns.map((col) => (
                      <Table.Cell key={col.key} py="3">
                        <Skeleton height="4" width="80%" />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))
              : data.map((row) => (
                  <Table.Row
                    key={keyExtractor(row)}
                    onClick={() => onRowClick?.(row)}
                    cursor={onRowClick ? 'pointer' : undefined}
                    _hover={onRowClick ? { bg: 'sidebar.hover' } : undefined}
                  >
                    {columns.map((col) => (
                      <Table.Cell key={col.key} textAlign={col.textAlign} py="3">
                        {col.cell(row)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </Box>
  );
}
