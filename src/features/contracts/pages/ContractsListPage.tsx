import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  HStack,
  Input,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { LuPlus, LuPencil, LuTrash2, LuBanknote, LuRefreshCw, LuUnlink, LuBan } from 'react-icons/lu';
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
  useSyncContractWithSerasaMutation,
  useRemoveContractFromSerasaMutation,
  useCancelContractByCreditorMutation,
} from '../api/useContractMutations';
import { ContractFormDialog } from '../components/ContractFormDialog';
import { TagsManager } from '../components/TagsManager';
import { CreateChargeDialog } from '@/features/payments/components/CreateChargeDialog';
import { GeneratePixAction } from '@/features/payments/components/GeneratePixAction';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toaster } from '@/components/ui/toaster';
import {
  DEBT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PROVIDER_STATUS_LABELS,
} from '@/lib/constants';
import type { Contract } from '@/types/models';
import type { CreateContractDto, UpdateContractDto } from '@/types/api';
import type { PaymentStatus, SerasaStatus } from '@/types/enums';

export default function ContractsListPage() {
  const { canCreate, canEdit, canDelete } = usePermission();
  const { creditorId } = useAuth();
  const isCreditorPortal = Boolean(creditorId);

  // Credor/Carteira selection
  const [selectedCreditorId, setSelectedCreditorId] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | ''>('');
  const [serasaStatusFilter, setSerasaStatusFilter] = useState<SerasaStatus | ''>('');
  const [installmentOnly, setInstallmentOnly] = useState('');
  const [cpfSearch, setCpfSearch] = useState('');

  // Contracts pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  // Load creditors for dropdown
  const { data: creditorsData } = useCreditorsQuery({ page: 1, limit: 100 }, !isCreditorPortal);

  // Load wallets filtered by selected creditor
  const { data: walletsData } = useWalletsQuery({
    page: 1,
    limit: 100,
    ...(selectedCreditorId && { creditorId: selectedCreditorId }),
  }, !isCreditorPortal);

  // Load wallet detail (with summary) when selected
  const { data: walletDetail } = useWalletDetailQuery(selectedWalletId || undefined);

  // Load contracts when wallet is selected
  const { data: contractsData, isLoading: contractsLoading } = useContractsQuery({
    page,
    limit,
    walletId: selectedWalletId || undefined,
    paymentStatus: paymentStatusFilter || undefined,
    serasaStatus: serasaStatusFilter || undefined,
    installmentOnly: installmentOnly === 'yes' ? true : undefined,
    debtorDocument: isCreditorPortal && cpfSearch.length === 11 ? cpfSearch : undefined,
  });

  const createMutation = useCreateContractMutation();
  const updateMutation = useUpdateContractMutation();
  const deleteMutation = useDeleteContractMutation();
  const syncWithSerasaMutation = useSyncContractWithSerasaMutation();
  const removeFromSerasaMutation = useRemoveContractFromSerasaMutation();
  const cancelByCreditorMutation = useCancelContractByCreditorMutation();

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [tagsTarget, setTagsTarget] = useState<Contract | null>(null);
  const [chargeTarget, setChargeTarget] = useState<Contract | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Contract | null>(null);

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
    return ['PENDING', 'FAILED', 'REMOVED'].includes(contract.serasaStatus);
  };

  const canSyncWithSerasa = (contract: Contract) => (
    ['NOT_ENABLED', 'PENDING', 'FAILED', 'REMOVED'].includes(contract.serasaStatus)
    && contract.status === 'ACTIVE'
    && contract.paymentStatus !== 'PAID'
  );
  const canRemoveFromSerasa = (contract: Contract) => ['SENT', 'REGISTERED', 'UPDATED'].includes(contract.serasaStatus);
  const handleSyncWithSerasa = (contract: Contract) => syncWithSerasaMutation.mutate(contract.id);

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
        { label: 'Total', count: summary.totalContracts, amount: summary.totalValue, color: 'blue' },
        { label: 'Em aberto', count: summary.paymentStatusTotals?.OPEN?.count ?? 0, amount: summary.paymentStatusTotals?.OPEN?.amount ?? 0, color: 'gray' },
        { label: 'Pagos', count: summary.paymentStatusTotals?.PAID?.count ?? 0, amount: summary.paymentStatusTotals?.PAID?.amount ?? 0, color: 'teal' },
        { label: 'Acordo quebrado', count: summary.paymentStatusTotals?.AGREEMENT_BREACHED?.count ?? 0, amount: summary.paymentStatusTotals?.AGREEMENT_BREACHED?.amount ?? 0, color: 'red' },
        { label: 'No Serasa', count: summary.serasaTotal?.count ?? 0, amount: summary.serasaTotal?.amount ?? 0, color: 'purple' },
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
      cell: (row) => <StatusBadge status={row.paymentStatus} label={PAYMENT_STATUS_LABELS[row.paymentStatus]} />,
    },
    { key: 'serasaStatus', header: 'Serasa', cell: (row) => <StatusBadge status={row.serasaStatus} label={PROVIDER_STATUS_LABELS[row.serasaStatus]} /> },
    {
      key: 'agreement',
      header: 'Acordo',
      cell: (row) => row.totalInstallments
        ? `${row.paidInstallments}/${row.totalInstallments} parcela(s)${row.agreementTotalAmount != null ? ` · ${formatCurrency(row.agreementTotalAmount)}` : ''}`
        : 'À vista',
    },
    { key: 'occurrenceDate', header: 'Ocorrência', cell: (row) => formatDate(row.occurrenceDate) },
    ...(isCreditorPortal
      ? [{
          key: 'actions',
          header: 'Ações',
          textAlign: 'end' as const,
          cell: (row: Contract) => (
            <Button
              size="xs"
              colorPalette="red"
              variant="outline"
              disabled={row.status === 'CANCELLED' || row.paymentStatus === 'PAID'}
              onClick={(event) => { event.stopPropagation(); setCancelTarget(row); }}
              title={row.status === 'CANCELLED' ? 'Contrato já cancelado' : row.paymentStatus === 'PAID' ? 'Contrato já está pago' : 'Dar baixa e retirar dos canais'}
            >
              <LuBan /> Dar baixa
            </Button>
          ),
        }]
      : canEdit || canDelete
      ? [{
          key: 'actions',
          header: 'Ações',
          textAlign: 'end' as const,
          cell: (row: Contract) => (
            <HStack gap="1" justify="end">
              {(canEdit || canCreate) && (
                <GeneratePixAction contract={row} />
              )}
              {(canEdit || canCreate) && row.status === 'ACTIVE' && row.paymentStatus !== 'PAID' && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="blue"
                  disabled={!canSyncWithSerasa(row)}
                  loading={syncWithSerasaMutation.isPending && syncWithSerasaMutation.variables === row.id}
                  onClick={(e) => { e.stopPropagation(); handleSyncWithSerasa(row); }}
                  aria-label="Sincronizar com Serasa"
                  title={canSyncWithSerasa(row) ? 'Sincronizar com Serasa' : 'Contrato já enviado à Serasa; aguarde o retorno antes de uma nova sincronização'}
                >
                  <LuRefreshCw />
                </Button>
              )}
              {(canEdit || canCreate) && canRemoveFromSerasa(row) && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  loading={removeFromSerasaMutation.isPending && removeFromSerasaMutation.variables === row.id}
                  onClick={(e) => { e.stopPropagation(); removeFromSerasaMutation.mutate(row.id); }}
                  aria-label="Remover da Serasa"
                  title="Remover da Serasa"
                >
                  <LuUnlink />
                </Button>
              )}
              {(canEdit || canCreate) && (
                <Button size="xs" variant="ghost" colorPalette="green" onClick={(e) => { e.stopPropagation(); setChargeTarget(row); }} aria-label="Gerar cobrança">
                  <LuBanknote />
                </Button>
              )}
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

      {isCreditorPortal ? (
        <Box mb="5" maxW="lg">
          <Input
            size="sm"
            value={cpfSearch}
            onChange={(event) => { setCpfSearch(event.target.value.replace(/\D/g, '').slice(0, 11)); setPage(1); }}
            placeholder="Digite o CPF para consultar"
            inputMode="numeric"
            aria-label="Consultar contratos por CPF"
          />
          <Text mt="2" fontSize="sm" color="fg.muted">Informe os 11 dígitos do CPF para consultar os contratos.</Text>
        </Box>
      ) : (
      /* Credor / Carteira Selection */
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
        <NativeSelect.Root size="sm" width="190px">
          <NativeSelect.Field value={paymentStatusFilter} onChange={(e) => { setPaymentStatusFilter(e.target.value as PaymentStatus | ''); setPage(1); }}>
            <option value="">Todos os pagamentos</option>
            <option value="OPEN">Em aberto</option>
            <option value="IN_AGREEMENT">Em acordo</option>
            <option value="INSTALLMENT">Parcelado</option>
            <option value="AGREEMENT_BREACHED">Acordo quebrado</option>
            <option value="PAID">Pago</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <NativeSelect.Root size="sm" width="190px">
          <NativeSelect.Field value={serasaStatusFilter} onChange={(e) => { setSerasaStatusFilter(e.target.value as SerasaStatus | ''); setPage(1); }}>
            <option value="">Todos no Serasa</option>
            <option value="NOT_ENABLED">Não enviado</option>
            <option value="SENT">Enviado</option>
            <option value="REGISTERED">Registrado</option>
            <option value="UPDATED">Atualizado</option>
            <option value="FAILED">Falhou</option>
            <option value="REMOVING">Removendo</option>
            <option value="REMOVED">Removido</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <NativeSelect.Root size="sm" width="180px">
          <NativeSelect.Field value={installmentOnly} onChange={(e) => { setInstallmentOnly(e.target.value); setPage(1); }}>
            <option value="">Todos os acordos</option>
            <option value="yes">Parcelados</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>
      )}

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
                {card.count}
              </Text>
              <Text fontSize="sm" color="fg.muted">{formatCurrency(card.amount)}</Text>
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
      {!isCreditorPortal && !selectedWalletId ? (
        <EmptyState
          title="Selecione uma carteira"
          description="Escolha um credor e uma carteira acima para visualizar os contratos"
        />
      ) : isCreditorPortal && cpfSearch.length !== 11 ? (
        <EmptyState
          title="Consulte um CPF"
          description="Digite o CPF completo para localizar os contratos vinculados ao seu credor."
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

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Dar baixa no contrato"
        message={`Deseja cancelar o contrato ${cancelTarget?.contractNumber}? Ele será desativado na carteira e removido dos canais de cobrança ativos.`}
        confirmLabel="Dar baixa"
        onConfirm={() => cancelTarget && cancelByCreditorMutation.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) })}
        loading={cancelByCreditorMutation.isPending}
      />

      {tagsTarget && (
        <TagsManager
          open={!!tagsTarget}
          onOpenChange={(open) => !open && setTagsTarget(null)}
          contract={tagsTarget}
        />
      )}

      {chargeTarget && (
        <CreateChargeDialog
          open={!!chargeTarget}
          onOpenChange={(open) => { if (!open) setChargeTarget(null); }}
          contract={chargeTarget}
        />
      )}
    </>
  );
}
