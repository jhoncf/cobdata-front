import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  Badge,
  Wrap,
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { LuPlus, LuPencil, LuTrash2, LuX } from 'react-icons/lu';
import {
  PageHeader,
  DataTable,
  PaginationBar,
  StatusBadge,
  ConfirmDialog,
  EmptyState,
} from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';
import { useWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { useWalletDetailQuery } from '@/features/wallets/api/useWalletDetailQuery';
import { useContractsQuery } from '../api/useContractsQuery';
import {
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
} from '../api/useContractMutations';
import { ContractFormDialog } from '../components/ContractFormDialog';
import { TagsManager } from '../components/TagsManager';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  DEBT_TYPE_LABELS,
  PROVIDER_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
} from '@/lib/constants';
import type { Contract } from '@/types/models';
import type { CreateContractDto, UpdateContractDto } from '@/types/api';

const PROVIDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'gray',
  SENT: 'blue',
  REGISTERED: 'green',
  UPDATED: 'green',
  FAILED: 'red',
  REMOVING: 'orange',
  REMOVED: 'gray',
  IN_AGREEMENT: 'purple',
  AGREEMENT_BREACHED: 'red',
  PAID: 'teal',
};

export default function ContractsListPage() {
  const { canCreate, canEdit, canDelete } = usePermission();

  // Credor/Carteira selection
  const [selectedCreditorId, setSelectedCreditorId] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  // Contracts pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  // Load creditors for dropdown
  const { data: creditorsData } = useCreditorsQuery({ page: 1, limit: 100 });

  // Load wallets filtered by selected creditor
  const { data: walletsData } = useWalletsQuery({
    page: 1,
    limit: 100,
    ...(selectedCreditorId && { creditorId: selectedCreditorId }),
  });

  // Load wallet detail (with summary) when selected
  const { data: walletDetail } = useWalletDetailQuery(selectedWalletId || undefined);

  // Load contracts when wallet is selected
  const { data: contractsData, isLoading: contractsLoading } = useContractsQuery({
    page,
    limit,
    walletId: selectedWalletId || undefined,
  });

  const createMutation = useCreateContractMutation();
  const updateMutation = useUpdateContractMutation();
  const deleteMutation = useDeleteContractMutation();

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [tagsTarget, setTagsTarget] = useState<Contract | null>(null);

  const handleCreditorChange = (creditorId: string) => {
    setSelectedCreditorId(creditorId);
    setSelectedWalletId('');
    setPage(1);
  };

  const handleWalletChange = (walletId: string) => {
    setSelectedWalletId(walletId);
    setPage(1);
  };

  const handleCreate = () => {
    setEditingContract(null);
    setFormOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormOpen(true);
  };

  const canEditContract = (contract: Contract) => {
    return ['PENDING', 'FAILED', 'REMOVED'].includes(contract.providerStatus);
  };

  const handleFormSubmit = (formData: CreateContractDto | UpdateContractDto) => {
    if (editingContract) {
      updateMutation.mutate(
        { id: editingContract.id, data: formData as UpdateContractDto },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createMutation.mutate(formData as CreateContractDto, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  // Summary stats
  const summary = walletDetail?.summary;
  const summaryCards = summary
    ? [
        { label: 'Total', value: summary.totalContracts, color: 'blue' },
        { label: 'Pendentes', value: summary.contractsByStatus['PENDING'] ?? 0, color: 'gray' },
        { label: 'Enviados', value: summary.contractsByStatus['SENT'] ?? 0, color: 'blue' },
        { label: 'Registrados', value: summary.contractsByStatus['REGISTERED'] ?? 0, color: 'green' },
        { label: 'Pagos', value: summary.contractsByStatus['PAID'] ?? 0, color: 'teal' },
        { label: 'Falhou', value: summary.contractsByStatus['FAILED'] ?? 0, color: 'red' },
      ]
    : [];

  const columns: DataTableColumn<Contract>[] = [
    { key: 'contractNumber', header: 'Nº Contrato', cell: (row) => row.contractNumber, minW: '120px' },
    { key: 'debtorDocument', header: 'Documento', cell: (row) => row.debtorDocument },
    { key: 'debtType', header: 'Tipo', cell: (row) => DEBT_TYPE_LABELS[row.debtType] },
    { key: 'originalValue', header: 'Valor', cell: (row) => formatCurrency(row.originalValue), textAlign: 'end' },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} label={CONTRACT_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'providerStatus',
      header: 'Canal',
      cell: (row) => <StatusBadge status={row.providerStatus} label={PROVIDER_STATUS_LABELS[row.providerStatus]} />,
    },
    { key: 'occurrenceDate', header: 'Ocorrência', cell: (row) => formatDate(row.occurrenceDate) },
    ...(canEdit || canDelete
      ? [{
          key: 'actions',
          header: 'Ações',
          textAlign: 'end' as const,
          cell: (row: Contract) => (
            <HStack gap="1" justify="end">
              {canEdit && canEditContract(row) && (
                <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(row); }} aria-label="Editar">
                  <LuPencil />
                </Button>
              )}
              {canDelete && canEditContract(row) && (
                <Button size="xs" variant="ghost" colorPalette="red" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }} aria-label="Excluir">
                  <LuTrash2 />
                </Button>
              )}
            </HStack>
          ),
        }]
      : []),
  ];

  return (
    <>
      <PageHeader title="Contratos">
        {canCreate && selectedWalletId && (
          <Button colorPalette="blue" size="sm" onClick={handleCreate}>
            <LuPlus /> Novo Contrato
          </Button>
        )}
      </PageHeader>

      {/* Credor / Carteira Selection */}
      <HStack gap="3" mb="5" wrap="wrap">
        <NativeSelect.Root size="sm" width="220px">
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

        <NativeSelect.Root size="sm" width="220px">
          <NativeSelect.Field
            value={selectedWalletId}
            onChange={(e) => handleWalletChange(e.target.value)}
          >
            <option value="">Selecione uma carteira</option>
            {walletsData?.data.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      {/* Wallet Summary Dashboard */}
      {selectedWalletId && summary && (
        <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap="3" mb="5">
          {summaryCards.map((card) => (
            <Card.Root key={card.label} size="sm">
              <Card.Body py="3" px="4">
                <Text fontSize="xs" color="fg.muted" fontWeight="medium" textTransform="uppercase">
                  {card.label}
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color={`${card.color}.fg`} mt="1">
                  {card.value}
                </Text>
              </Card.Body>
            </Card.Root>
          ))}
          <Card.Root size="sm">
            <Card.Body py="3" px="4">
              <Text fontSize="xs" color="fg.muted" fontWeight="medium" textTransform="uppercase">
                Valor Total
              </Text>
              <Text fontSize="lg" fontWeight="bold" mt="1">
                {formatCurrency(summary.totalValue)}
              </Text>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>
      )}

      {/* Content */}
      {!selectedWalletId ? (
        <EmptyState
          title="Selecione uma carteira"
          description="Escolha um credor e uma carteira acima para visualizar os contratos"
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={contractsData?.data ?? []}
            loading={contractsLoading}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => { if (canEdit) setTagsTarget(row); }}
          />

          <Box mt="4">
            <PaginationBar
              page={page}
              totalPages={contractsData?.meta.totalPages ?? 1}
              pageSize={limit}
              onChange={setPage}
            />
          </Box>
        </>
      )}

      <ContractFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contract={editingContract}
        onSubmit={handleFormSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Contrato"
        message={`Tem certeza que deseja excluir o contrato "${deleteTarget?.contractNumber}"?`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />

      {tagsTarget && (
        <TagsManager
          open={!!tagsTarget}
          onOpenChange={(open) => !open && setTagsTarget(null)}
          contract={tagsTarget}
        />
      )}
    </>
  );
}
