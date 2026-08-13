import { useSearchParams } from 'react-router-dom';
import { HStack, Input, Badge, Text, Box } from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { PageHeader, DataTable, PaginationBar } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useAuditLogsQuery } from '../api/useAuditLogsQuery';
import type { AuditLog } from '../api/useAuditLogsQuery';
import { formatDateTime } from '@/lib/formatters';

const ACTION_COLORS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: 'green',
  AUTH_LOGIN_FAILURE: 'red',
  AUTH_LOGOUT: 'gray',
  CREDITOR_CREATE: 'blue',
  CREDITOR_UPDATE: 'orange',
  CREDITOR_DELETE: 'red',
  WALLET_CREATE: 'blue',
  WALLET_UPDATE: 'orange',
  WALLET_DELETE: 'red',
  CONTRACT_CREATE: 'blue',
  CONTRACT_UPDATE: 'orange',
  CONTRACT_DELETE: 'red',
  IMPORT_UPLOAD: 'purple',
  IMPORT_CONFIRM: 'green',
  IMPORT_CANCEL: 'gray',
  OPERATION_CREATE: 'teal',
  OPERATION_CANCEL: 'gray',
  USER_INVITE: 'blue',
  USER_UPDATE: 'orange',
};

const RESOURCE_TYPES = [
  'Auth',
  'Creditor',
  'Wallet',
  'Contract',
  'Import',
  'Operation',
  'User',
  'Provider',
];

export default function AuditLogsPage() {
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const resourceType = searchParams.get('resourceType') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const limit = 25;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  const { data, isLoading } = useAuditLogsQuery({
    page,
    limit,
    ...(resourceType && { resourceType }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  });

  const handleResourceTypeChange = (value: string) => {
    updateParams({ resourceType: value || undefined, page: undefined });
  };

  const handleDateFromChange = (value: string) => {
    updateParams({ dateFrom: value || undefined, page: undefined });
  };

  const handleDateToChange = (value: string) => {
    updateParams({ dateTo: value || undefined, page: undefined });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Data/Hora',
      cell: (row) => (
        <Text fontSize="xs" fontFamily="mono">
          {formatDateTime(row.createdAt)}
        </Text>
      ),
      minW: '140px',
    },
    {
      key: 'action',
      header: 'Ação',
      cell: (row) => (
        <Badge
          colorPalette={ACTION_COLORS[row.action] ?? 'gray'}
          variant="subtle"
          size="sm"
          rounded="md"
        >
          {row.action}
        </Badge>
      ),
      minW: '180px',
    },
    {
      key: 'user',
      header: 'Responsável',
      cell: (row) => {
        if (!row.user) return <Text fontSize="sm" color="fg.muted">Sistema</Text>;
        return (
          <Box>
            <Text fontSize="sm">{row.user.name || row.user.email}</Text>
            {row.user.name && (
              <Text fontSize="xs" color="fg.muted">{row.user.email}</Text>
            )}
          </Box>
        );
      },
      minW: '180px',
    },
    {
      key: 'resourceType',
      header: 'Recurso',
      cell: (row) => (
        <HStack gap="1">
          <Text fontSize="sm">{row.resourceType}</Text>
          {row.resourceId && (
            <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
              {row.resourceId.slice(0, 8)}…
            </Text>
          )}
        </HStack>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP',
      cell: (row) => (
        <Text fontSize="xs" fontFamily="mono" color="fg.muted">
          {row.ipAddress ?? '—'}
        </Text>
      ),
    },
    {
      key: 'metadata',
      header: 'Detalhes',
      cell: (row) => {
        if (!row.metadata) return '—';
        const method = row.metadata.method as string | undefined;
        const path = row.metadata.path as string | undefined;
        if (method && path) {
          return (
            <Text fontSize="xs" color="fg.muted" fontFamily="mono">
              {method} {path}
            </Text>
          );
        }
        return '—';
      },
    },
  ];

  return (
    <>
      <PageHeader title="Logs de Auditoria" />

      <HStack mb="4" gap="2" wrap="wrap">
        <NativeSelect.Root size="sm" width="160px">
          <NativeSelect.Field
            value={resourceType}
            onChange={(e) => handleResourceTypeChange(e.target.value)}
          >
            <option value="">Todos recursos</option>
            {RESOURCE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <Input
          type="date"
          size="sm"
          width="150px"
          value={dateFrom}
          onChange={(e) => handleDateFromChange(e.target.value)}
        />
        <Input
          type="date"
          size="sm"
          width="150px"
          value={dateTo}
          onChange={(e) => handleDateToChange(e.target.value)}
        />
      </HStack>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
      />

      <Box mt="4">
        <PaginationBar
          page={page}
          totalPages={data?.meta.totalPages ?? 1}
          pageSize={limit}
          onChange={handlePageChange}
        />
      </Box>
    </>
  );
}
