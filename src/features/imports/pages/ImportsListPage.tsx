import { Link as RouterLink } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import {
  HStack,
  Table,
  Link,
  Spinner,
  Stack,
} from '@chakra-ui/react';
import { useImportsQuery } from '../api/useImportsQuery';
import { useAllWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { StatusBadge, PageHeader, PaginationBar, EmptyState } from '@/components/common';
import { IMPORT_STATUS_LABELS } from '@/lib/constants';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@chakra-ui/react';
import { LuPlus } from 'react-icons/lu';
import { NativeSelect } from '@chakra-ui/react';
import { ImportBatchStatus } from '@/types/enums';

export default function ImportsListPage() {
  const { canCreate } = usePermission();

  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const status = searchParams.get('status') || '';
  const walletId = searchParams.get('walletId') || '';

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  const { data, isLoading } = useImportsQuery({
    page,
    limit: 20,
    status: status || undefined,
    walletId: walletId || undefined,
  });

  const { data: walletsData } = useAllWalletsQuery();

  const handleStatusChange = (value: string) => {
    updateParams({ status: value || undefined, page: undefined });
  };

  const handleWalletChange = (value: string) => {
    updateParams({ walletId: value || undefined, page: undefined });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  return (
    <Stack gap="4">
      <PageHeader title="Importações">
        {canCreate && (
          <Button asChild colorPalette="blue" size="sm">
            <RouterLink to="/imports/new">
              <LuPlus /> Nova Importação
            </RouterLink>
          </Button>
        )}
      </PageHeader>

      <HStack gap="3" wrap="wrap">
        <NativeSelect.Root size="sm" width="200px">
          <NativeSelect.Field
            placeholder="Todos os status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {Object.entries(IMPORT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </NativeSelect.Field>
        <NativeSelect.Indicator />
        </NativeSelect.Root>

        <NativeSelect.Root size="sm" width="220px">
          <NativeSelect.Field
            placeholder="Todas as carteiras"
            value={walletId}
            onChange={(e) => handleWalletChange(e.target.value)}
          >
            {walletsData?.data.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </NativeSelect.Field>
        <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      {isLoading ? (
        <Spinner />
      ) : !data?.data.length ? (
        <EmptyState title="Nenhuma importação encontrada" />
      ) : (
        <>
          <Table.ScrollArea borderWidth="1px" rounded="md">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Arquivo</Table.ColumnHeader>
                  <Table.ColumnHeader>Carteira</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Linhas</Table.ColumnHeader>
                  <Table.ColumnHeader>Criado em</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.data.map((batch) => (
                  <Table.Row key={batch.id}>
                    <Table.Cell>
                      <Link asChild colorPalette="blue">
                        <RouterLink to={`/imports/${batch.id}`}>
                          {batch.fileName}
                        </RouterLink>
                      </Link>
                    </Table.Cell>
                    <Table.Cell>{batch.wallet?.name ?? '-'}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge
                        status={batch.status}
                        label={IMPORT_STATUS_LABELS[batch.status as ImportBatchStatus] ?? batch.status}
                      />
                    </Table.Cell>
                    <Table.Cell>{batch.totalLines}</Table.Cell>
                    <Table.Cell>
                      {new Date(batch.createdAt).toLocaleDateString('pt-BR')}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>

          <PaginationBar
            page={page}
            totalPages={data.meta.totalPages}
            pageSize={data.meta.limit}
            onChange={handlePageChange}
          />
        </>
      )}
    </Stack>
  );
}
