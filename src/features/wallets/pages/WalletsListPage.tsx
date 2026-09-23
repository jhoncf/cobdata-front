import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, HStack, Input } from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { LuArchive, LuPlus, LuSearch, LuPencil } from 'react-icons/lu';
import {
  PageHeader,
  DataTable,
  PaginationBar,
  StatusBadge,
} from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';
import { useWalletsQuery } from '../api/useWalletsQuery';
import {
  useCreateWalletMutation,
  useUpdateWalletMutation,
} from '../api/useWalletMutations';
import { WalletFormDialog } from '../components/WalletFormDialog';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/formatters';
import type { Wallet } from '@/types/models';
import { WalletStatus } from '@/types/enums';

const LAST_CREDITOR_SESSION_KEY = 'cobdata.wallets.lastCreditorId';

export default function WalletsListPage() {
  const navigate = useNavigate();
  const { canCreate, canEdit } = usePermission();

  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action');
  const editId = searchParams.get('id');
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const selectedCreditorId =
    searchParams.get('creditorId') ??
    sessionStorage.getItem(LAST_CREDITOR_SESSION_KEY) ??
    '';
  const status = searchParams.get('status') as WalletStatus | null;
  const sortBy = (searchParams.get('sortBy') as 'name' | 'createdAt' | 'status' | null) ?? 'createdAt';
  const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc' | null) ?? 'desc';

  const [searchInput, setSearchInput] = useState(search);
  const limit = 20;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  // Load creditors for filter dropdown
  const { data: creditorsData } = useCreditorsQuery({ page: 1, limit: 100 });

  const { data, isLoading } = useWalletsQuery({
    page,
    limit,
    search,
    creditorId: selectedCreditorId || undefined,
    status: status ?? undefined,
    sortBy,
    sortDirection,
  });
  const createMutation = useCreateWalletMutation();
  const updateMutation = useUpdateWalletMutation();

  // Dialog state derived from URL
  const formOpen = action === 'new' || action === 'edit';
  const editingWallet = action === 'edit' && editId
    ? data?.data.find((w) => w.id === editId) ?? null
    : null;

  const handleSearch = () => {
    updateParams({ search: searchInput || undefined, page: undefined });
  };

  const handleCreditorChange = (creditorId: string) => {
    if (creditorId) {
      sessionStorage.setItem(LAST_CREDITOR_SESSION_KEY, creditorId);
    } else {
      sessionStorage.removeItem(LAST_CREDITOR_SESSION_KEY);
    }
    updateParams({ creditorId: creditorId || undefined, page: undefined });
  };

  const handleCreate = () => {
    updateParams({ action: 'new', id: undefined });
  };

  const handleEdit = (wallet: Wallet) => {
    updateParams({ action: 'edit', id: wallet.id });
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      updateParams({ action: undefined, id: undefined });
    }
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage > 1 ? String(newPage) : undefined });
  };

  const handleFormSubmit = (formData: { name: string; creditorId: string; serasaWalletExternalId: string; cobcomDiscountPercent: number; offerFirstInstallmentDays: number; offerMinInstallmentValue: number; offerMaxInstallments: number; defaultDebtType: string; smsTemplate: string }) => {
    if (editingWallet) {
      updateMutation.mutate(
        { id: editingWallet.id, data: { name: formData.name, serasaWalletExternalId: formData.serasaWalletExternalId, cobcomDiscountPercent: formData.cobcomDiscountPercent, offerFirstInstallmentDays: formData.offerFirstInstallmentDays, offerMinInstallmentValue: formData.offerMinInstallmentValue, offerMaxInstallments: formData.offerMaxInstallments, defaultDebtType: formData.defaultDebtType, smsTemplate: formData.smsTemplate } },
        { onSuccess: () => updateParams({ action: undefined, id: undefined }) },
      );
    } else {
      createMutation.mutate(
        { creditorId: formData.creditorId, data: { name: formData.name, serasaWalletExternalId: formData.serasaWalletExternalId, cobcomDiscountPercent: formData.cobcomDiscountPercent, offerFirstInstallmentDays: formData.offerFirstInstallmentDays, offerMinInstallmentValue: formData.offerMinInstallmentValue, offerMaxInstallments: formData.offerMaxInstallments, defaultDebtType: formData.defaultDebtType, smsTemplate: formData.smsTemplate } },
        { onSuccess: () => updateParams({ action: undefined, id: undefined }) },
      );
    }
  };

  const archiveWallet = (wallet: Wallet) => {
    updateMutation.mutate({ id: wallet.id, data: { status: WalletStatus.INACTIVE } });
  };

  const columns: DataTableColumn<Wallet>[] = [
    { key: 'name', header: 'Nome', cell: (row) => <RouterLink to={`/wallets/${row.id}`} onClick={(event) => event.stopPropagation()} style={{ color: 'var(--chakra-colors-blue-fg)', fontWeight: 600, textDecoration: 'underline' }}>{row.name}</RouterLink> },
    {
      key: 'creditor',
      header: 'Credor',
      cell: (row) => row.creditor?.name ?? '—',
    },
    {
      key: 'contracts',
      header: 'Contratos',
      textAlign: 'end',
      cell: (row) => row._count?.contracts ?? 0,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} label={row.status === WalletStatus.INACTIVE ? 'Arquivada' : 'Ativa'} />,
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      cell: (row) => formatDate(row.createdAt),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: 'Ações',
            textAlign: 'end' as const,
            cell: (row: Wallet) => (
              <HStack gap="1" justify="end">
                {canEdit && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(row);
                    }}
                    aria-label="Editar"
                  >
                    <LuPencil />
                  </Button>
                )}
                {canEdit && row.status === WalletStatus.ACTIVE && (
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="orange"
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveWallet(row);
                    }}
                    aria-label="Arquivar"
                    title="Arquivar carteira"
                  >
                    <LuArchive />
                  </Button>
                )}
              </HStack>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Carteiras">
        {canCreate && (
          <Button colorPalette="blue" size="sm" onClick={handleCreate}>
            <LuPlus /> Nova Carteira
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <HStack mb="4" gap="3" flexDir={{ base: 'column', sm: 'row' }} align={{ base: 'stretch', sm: 'center' }}>
        <NativeSelect.Root size="sm" width={{ base: 'full', sm: '220px' }}>
          <NativeSelect.Field
            value={selectedCreditorId}
            onChange={(e) => handleCreditorChange(e.target.value)}
          >
            <option value="">Todos os credores</option>
            {creditorsData?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <NativeSelect.Root size="sm" width={{ base: 'full', sm: '170px' }}>
          <NativeSelect.Field value={status ?? ''} onChange={(e) => updateParams({ status: e.target.value || undefined, page: undefined })}>
            <option value="">Ativas e arquivadas</option>
            <option value="ACTIVE">Ativas</option>
            <option value="INACTIVE">Arquivadas</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <NativeSelect.Root size="sm" width={{ base: 'full', sm: '210px' }}>
          <NativeSelect.Field value={`${sortBy}:${sortDirection}`} onChange={(e) => { const [nextSortBy, nextDirection] = e.target.value.split(':'); updateParams({ sortBy: nextSortBy, sortDirection: nextDirection, page: undefined }); }}>
            <option value="createdAt:desc">Mais recentes primeiro</option>
            <option value="createdAt:asc">Mais antigas primeiro</option>
            <option value="name:asc">Nome: A–Z</option>
            <option value="name:desc">Nome: Z–A</option>
            <option value="status:asc">Status</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <HStack gap="2" w={{ base: 'full', sm: 'auto' }}>
          <Input
            placeholder="Buscar por nome..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            w={{ base: 'full', sm: '240px' }}
            size="sm"
          />
          <Button size="sm" variant="outline" onClick={handleSearch}>
            <LuSearch />
          </Button>
        </HStack>
      </HStack>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/wallets/${row.id}`)}
      />

      <PaginationBar
        page={page}
        totalPages={data?.meta.totalPages ?? 1}
        pageSize={limit}
        onChange={handlePageChange}
      />

      <WalletFormDialog
        open={formOpen}
        onOpenChange={handleCloseDialog}
        wallet={editingWallet}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

    </>
  );
}
