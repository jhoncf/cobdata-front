import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Dialog,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  Stat,
  Table,
  Spinner,
  Menu,
  Portal,
  Input,
  NativeSelect,
} from '@chakra-ui/react';
import { LuArrowLeft, LuUpload, LuPlus, LuPencil, LuArrowUp, LuArrowDown, LuRadio, LuPhoneCall, LuEye, LuRefreshCw, LuUnlink, LuEllipsis } from 'react-icons/lu';
import { PageHeader, StatusBadge, LoadingOverlay, PaginationBar, EmptyState, ConfirmDialog } from '@/components/common';
import { useWalletDetailQuery } from '../api/useWalletDetailQuery';
import { useUpdateWalletMutation } from '../api/useWalletMutations';
import { useContractsQuery } from '@/features/contracts/api/useContractsQuery';
import { useBulkTransferContractsMutation, useCreateContractMutation, useUpdateContractMutation, useSyncContractWithSerasaMutation, useRemoveContractFromSerasaMutation } from '@/features/contracts/api/useContractMutations';
import { ContractFormDialog } from '@/features/contracts/components/ContractFormDialog';
import { GeneratePixAction } from '@/features/payments/components/GeneratePixAction';
import { WalletFormDialog } from '../components/WalletFormDialog';
import { LigueLeadDialog } from '../components/LigueLeadDialog';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { toaster } from '@/components/ui/toaster';
import { useCreateOperationMutation } from '@/features/operations/api/useOperationMutations';
import { useOperationPreviewQuery } from '@/features/operations/api/useOperationsQuery';
import { PAYMENT_STATUS_LABELS, PROVIDER_STATUS_LABELS } from '@/lib/constants';
import { usePermission } from '@/hooks/usePermission';
import { useAllWalletsQuery } from '../api/useWalletsQuery';
import { OperationAction, type PaymentStatus, type SerasaStatus } from '@/types/enums';
import type { CreateContractDto, OperationContractFilters, UpdateContractDto } from '@/types/api';
import type { Contract } from '@/types/models';

type SortField = 'contractNumber' | 'debtorDocument' | 'originalValue' | 'updatedValue' | 'paymentStatus' | 'serasaStatus' | 'occurrenceDate';
type SortDirection = 'asc' | 'desc';

export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = usePermission();
  const [contractsPage, setContractsPage] = useState(1);
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showLigueLead, setShowLigueLead] = useState(false);
  const [ligueLeadContractId, setLigueLeadContractId] = useState<string>();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bulkAction, setBulkAction] = useState<OperationAction | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | ''>('');
  const [serasaStatusFilter, setSerasaStatusFilter] = useState<SerasaStatus | ''>('');
  const [installmentOnly, setInstallmentOnly] = useState(false);
  const [minOriginalValue, setMinOriginalValue] = useState('');
  const [maxOriginalValue, setMaxOriginalValue] = useState('');
  const [minUpdatedValue, setMinUpdatedValue] = useState('');
  const [maxUpdatedValue, setMaxUpdatedValue] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [destinationWalletId, setDestinationWalletId] = useState('');

  const operationFilters = useMemo<OperationContractFilters>(() => ({
    ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
    ...(serasaStatusFilter ? { serasaStatus: serasaStatusFilter } : {}),
    ...(installmentOnly ? { installmentOnly: true } : {}),
    ...(minOriginalValue ? { minOriginalValue: Number(minOriginalValue) } : {}),
    ...(maxOriginalValue ? { maxOriginalValue: Number(maxOriginalValue) } : {}),
    ...(minUpdatedValue ? { minUpdatedValue: Number(minUpdatedValue) } : {}),
    ...(maxUpdatedValue ? { maxUpdatedValue: Number(maxUpdatedValue) } : {}),
  }), [paymentStatusFilter, serasaStatusFilter, installmentOnly, minOriginalValue, maxOriginalValue, minUpdatedValue, maxUpdatedValue]);

  const { data: wallet, isLoading } = useWalletDetailQuery(id ?? '');
  const { data: contractsData, isLoading: contractsLoading } = useContractsQuery({
    walletId: id,
    page: contractsPage,
    limit: 20,
    ...operationFilters,
  });
  const createContractMutation = useCreateContractMutation();
  const updateContractMutation = useUpdateContractMutation();
  const updateWalletMutation = useUpdateWalletMutation();
  const bulkTransferMutation = useBulkTransferContractsMutation();
  const { data: allWallets } = useAllWalletsQuery();
  const createOperationMutation = useCreateOperationMutation();
  const { data: bulkPreview, isLoading: bulkPreviewLoading } = useOperationPreviewQuery(
    wallet?.serasaWalletId ? id : undefined,
    bulkAction ?? undefined,
    operationFilters,
  );
  const syncWithSerasaMutation = useSyncContractWithSerasaMutation();
  const removeFromSerasaMutation = useRemoveContractFromSerasaMutation();
  const destinationWallets = useMemo(
    () => allWallets?.data.filter((candidate) => candidate.id !== id && candidate.creditorId === wallet?.creditorId && candidate.status === 'ACTIVE') ?? [],
    [allWallets?.data, id, wallet?.creditorId],
  );

  const canSyncWithSerasa = (contract: Contract) => (
    ['NOT_ENABLED', 'PENDING', 'FAILED', 'REMOVED'].includes(contract.serasaStatus)
    && contract.status === 'ACTIVE'
    && contract.paymentStatus !== 'PAID'
  );
  const canRemoveFromSerasa = (contract: Contract) => ['SENT', 'REGISTERED', 'UPDATED'].includes(contract.serasaStatus);
  const handleSyncWithSerasa = (contract: Contract) => {
    if (!wallet?.serasaWalletId) {
      toaster.create({ type: 'warning', title: 'Selecione uma Carteira Serasa', description: 'Clique em Editar, selecione a Carteira Serasa e salve antes de sincronizar.' });
      return;
    }
    syncWithSerasaMutation.mutate(contract.id);
  };
  const handleBulkAction = (action: OperationAction) => {
    if (!wallet?.serasaWalletId) {
      toaster.create({ type: 'warning', title: 'Selecione uma Carteira Serasa', description: 'Clique em Editar, selecione a Carteira Serasa e salve antes de sincronizar.' });
      return;
    }
    setBulkAction(action);
  };

  const handleCreateContract = (data: CreateContractDto) => {
    const payload = { ...data, walletId: id! };
    createContractMutation.mutate(payload, {
      onSuccess: () => setShowContractForm(false),
    });
  };

  const handleUpdateContract = (data: UpdateContractDto) => {
    if (!editingContract) return;
    updateContractMutation.mutate(
      { id: editingContract.id, data },
      { onSuccess: () => setEditingContract(null) },
    );
  };

  const handleEditWallet = (formData: { name: string; creditorId: string; serasaWalletId?: string; cobcomDiscountPercent: number }) => {
    updateWalletMutation.mutate(
      { id: id!, data: { name: formData.name, serasaWalletId: formData.serasaWalletId || null, cobcomDiscountPercent: formData.cobcomDiscountPercent } },
      { onSuccess: () => setShowEditForm(false) },
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedContracts = useMemo(() => {
    if (!contractsData?.data || !sortField) return contractsData?.data ?? [];

    return [...contractsData.data].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'contractNumber':
          comparison = (a.contractNumber ?? '').localeCompare(b.contractNumber ?? '');
          break;
        case 'debtorDocument':
          comparison = (a.debtorDocument ?? '').localeCompare(b.debtorDocument ?? '');
          break;
        case 'originalValue':
          comparison = a.originalValue - b.originalValue;
          break;
        case 'updatedValue':
          comparison = (a.updatedValue ?? 0) - (b.updatedValue ?? 0);
          break;
        case 'paymentStatus':
          comparison = a.paymentStatus.localeCompare(b.paymentStatus);
          break;
        case 'serasaStatus':
          comparison = a.serasaStatus.localeCompare(b.serasaStatus);
          break;
        case 'occurrenceDate':
          comparison = new Date(a.occurrenceDate).getTime() - new Date(b.occurrenceDate).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contractsData?.data, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <LuArrowUp size={12} /> : <LuArrowDown size={12} />;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Table.ColumnHeader
      cursor="pointer"
      onClick={() => handleSort(field)}
      _hover={{ color: 'fg.default' }}
      userSelect="none"
    >
      <HStack gap="1">
        <Text as="span">{children}</Text>
        <SortIcon field={field} />
      </HStack>
    </Table.ColumnHeader>
  );

  if (isLoading) return <LoadingOverlay />;
  if (!wallet) return <Text>Carteira não encontrada.</Text>;

  return (
    <>
      <PageHeader title={wallet.name}>
        <HStack gap="2">
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button size="sm" colorPalette="blue">
                <LuEllipsis /> Ações
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  {canEdit && <Menu.Item value="edit" onClick={() => setShowEditForm(true)}><LuPencil /> Editar carteira</Menu.Item>}
                  <Menu.Item value="new-contract" onClick={() => setShowContractForm(true)}><LuPlus /> Novo contrato</Menu.Item>
                  <Menu.Item value="import" asChild><RouterLink to={`/imports/new?walletId=${id}`}><LuUpload /> Importar contratos</RouterLink></Menu.Item>
                  {canEdit && <Menu.Item value="communications" onClick={() => { setLigueLeadContractId(undefined); setShowLigueLead(true); }}><LuRadio /> Comunicações</Menu.Item>}
                  {canEdit && <Menu.Separator />}
                  {canEdit && <Menu.Item value="sync-serasa" onClick={() => handleBulkAction(OperationAction.CREATE_OR_UPDATE)}><LuRefreshCw /> Enviar em massa ao Serasa</Menu.Item>}
                  {canEdit && <Menu.Item value="remove-serasa" color="fg.error" onClick={() => handleBulkAction(OperationAction.REMOVE)}><LuUnlink /> Remover em massa do Serasa</Menu.Item>}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
          <Button size="sm" variant="outline" onClick={() => navigate('/wallets')}>
            <LuArrowLeft /> Voltar
          </Button>
        </HStack>
      </PageHeader>

      <Stack gap="6">
        {/* Informações Gerais */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Informações Gerais</Card.Title>
          </Card.Header>
          <Card.Body>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
              <Box>
                <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                  Credor
                </Text>
                <Text>{wallet.creditor?.name ?? '—'}</Text>
              </Box>
              <Box>
                <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                  Status
                </Text>
                <StatusBadge status={wallet.status} />
              </Box>
              <Box>
                <Text fontWeight="medium" color="fg.muted" fontSize="sm">
                  Criado em
                </Text>
                <Text>{formatDate(wallet.createdAt)}</Text>
              </Box>
            </SimpleGrid>
          </Card.Body>
        </Card.Root>

        {/* Dashboard da Carteira */}
        {wallet.summary && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Resumo da Carteira</Card.Title>
            </Card.Header>
            <Card.Body>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap="6">
                <Stat.Root>
                  <Stat.Label>Total de Contratos</Stat.Label>
                  <Stat.ValueText>{wallet.summary.totalContracts}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root>
                  <Stat.Label>Valor Total</Stat.Label>
                  <Stat.ValueText>
                    {formatCurrency(wallet.summary.totalValue)}
                  </Stat.ValueText>
                </Stat.Root>
                {(['OPEN', 'PAID', 'AGREEMENT_BREACHED'] as PaymentStatus[]).map((status) => {
                  const stat = wallet.summary.paymentStatusTotals?.[status] ?? { count: 0, amount: 0 };
                  return <Stat.Root key={status}>
                    <Stat.Label>{PAYMENT_STATUS_LABELS[status]}</Stat.Label>
                    <Stat.ValueText>{stat.count}</Stat.ValueText>
                    <Text fontSize="sm" color="fg.muted">{formatCurrency(stat.amount)}</Text>
                  </Stat.Root>;
                })}
                <Stat.Root>
                  <Stat.Label>No Serasa</Stat.Label>
                  <Stat.ValueText>{wallet.summary.serasaTotal?.count ?? 0}</Stat.ValueText>
                  <Text fontSize="sm" color="fg.muted">{formatCurrency(wallet.summary.serasaTotal?.amount ?? 0)}</Text>
                </Stat.Root>
              </SimpleGrid>
            </Card.Body>
          </Card.Root>
        )}

        {/* Listagem de Contratos */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Contratos</Card.Title>
          </Card.Header>
          <Card.Body>
            <HStack gap="3" wrap="wrap" mb="4">
              <NativeSelect.Root size="sm" width="180px">
                <NativeSelect.Field value={paymentStatusFilter} onChange={(event) => { setPaymentStatusFilter(event.target.value as PaymentStatus | ''); setContractsPage(1); }}>
                  <option value="">Status financeiro</option>
                  <option value="OPEN">Em aberto</option>
                  <option value="IN_AGREEMENT">Em acordo</option>
                  <option value="INSTALLMENT">Parcelado</option>
                  <option value="AGREEMENT_BREACHED">Acordo quebrado</option>
                  <option value="PAID">Pago</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <NativeSelect.Root size="sm" width="170px">
                <NativeSelect.Field value={serasaStatusFilter} onChange={(event) => { setSerasaStatusFilter(event.target.value as SerasaStatus | ''); setContractsPage(1); }}>
                  <option value="">Status Serasa</option>
                  <option value="NOT_ENABLED">Não enviado</option>
                  <option value="SENT">Enviado</option>
                  <option value="REGISTERED">Registrado</option>
                  <option value="FAILED">Falhou</option>
                  <option value="REMOVED">Removido</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <NativeSelect.Root size="sm" width="150px">
                <NativeSelect.Field value={installmentOnly ? 'yes' : ''} onChange={(event) => { setInstallmentOnly(event.target.value === 'yes'); setContractsPage(1); }}>
                  <option value="">Todos os acordos</option>
                  <option value="yes">Parcelados</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Input size="sm" width="145px" type="number" min="0" placeholder="Valor original mín." value={minOriginalValue} onChange={(event) => { setMinOriginalValue(event.target.value); setContractsPage(1); }} />
              <Input size="sm" width="145px" type="number" min="0" placeholder="Valor original máx." value={maxOriginalValue} onChange={(event) => { setMaxOriginalValue(event.target.value); setContractsPage(1); }} />
              <Input size="sm" width="155px" type="number" min="0" placeholder="Valor atualizado mín." value={minUpdatedValue} onChange={(event) => { setMinUpdatedValue(event.target.value); setContractsPage(1); }} />
              <Input size="sm" width="155px" type="number" min="0" placeholder="Valor atualizado máx." value={maxUpdatedValue} onChange={(event) => { setMaxUpdatedValue(event.target.value); setContractsPage(1); }} />
              {canEdit && <Menu.Root>
                <Menu.Trigger asChild>
                  <Button size="sm" variant="outline" colorPalette="blue" disabled={!contractsData?.meta.total}>
                    <LuEllipsis /> Ações
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      <Menu.Item value="transfer-filtered" onClick={() => { setDestinationWalletId(''); setTransferOpen(true); }}>
                        Transferir contratos filtrados
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>}
            </HStack>
            {contractsLoading ? (
              <Spinner />
            ) : !contractsData?.data.length ? (
              <EmptyState title="Nenhum contrato nesta carteira" />
            ) : (
              <Stack gap="4">
                <Table.ScrollArea borderWidth="1px" rounded="md">
                  <Table.Root size="sm" stickyHeader interactive>
                    <Table.Header>
                      <Table.Row>
                        <SortableHeader field="contractNumber">Nº Contrato</SortableHeader>
                        <SortableHeader field="debtorDocument">Documento</SortableHeader>
                        <SortableHeader field="originalValue">Valor Original</SortableHeader>
                        <SortableHeader field="updatedValue">Valor Atualizado</SortableHeader>
                        <SortableHeader field="paymentStatus">Status</SortableHeader>
                        <SortableHeader field="serasaStatus">Serasa</SortableHeader>
                        <SortableHeader field="occurrenceDate">Data Ocorrência</SortableHeader>
                        {canEdit && <Table.ColumnHeader width="190px">Ações</Table.ColumnHeader>}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {sortedContracts.map((contract) => (
                        <Table.Row key={contract.id}>
                          <Table.Cell fontWeight="medium">
                            {contract.contractNumber}
                          </Table.Cell>
                          <Table.Cell>{contract.debtorDocument}</Table.Cell>
                          <Table.Cell>
                            {formatCurrency(contract.originalValue)}
                          </Table.Cell>
                          <Table.Cell>
                            {contract.updatedValue
                              ? formatCurrency(contract.updatedValue)
                              : '—'}
                          </Table.Cell>
                          <Table.Cell>
                            <StatusBadge
                              status={contract.paymentStatus}
                              label={PAYMENT_STATUS_LABELS[contract.paymentStatus] ?? contract.paymentStatus}
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <StatusBadge
                              status={contract.serasaStatus}
                              label={PROVIDER_STATUS_LABELS[contract.serasaStatus] ?? contract.serasaStatus}
                            />
                          </Table.Cell>
                          <Table.Cell>
                            {formatDate(contract.occurrenceDate)}
                          </Table.Cell>
                          {canEdit && (
                            <Table.Cell>
                              <HStack gap="1">
                                <Button
                                  asChild
                                  size="xs"
                                  variant="ghost"
                                  aria-label="Ver detalhes do contrato"
                                  title="Ver detalhes do contrato"
                                >
                                  <RouterLink to={`/contracts/${contract.id}`}>
                                    <LuEye />
                                  </RouterLink>
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  aria-label="Editar contrato"
                                  title="Editar contrato"
                                  onClick={() => setEditingContract(contract)}
                                >
                                  <LuPencil />
                                </Button>
                                <GeneratePixAction contract={contract} />
                                {contract.status === 'ACTIVE' && contract.paymentStatus !== 'PAID' && (
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    colorPalette="blue"
                                    aria-label="Sincronizar com Serasa"
                                    title={!wallet?.serasaWalletId
                                      ? 'Vincule uma carteira Serasa a esta carteira CRM antes de sincronizar'
                                      : canSyncWithSerasa(contract)
                                        ? 'Sincronizar com Serasa'
                                        : 'Contrato já enviado à Serasa; aguarde o retorno antes de uma nova sincronização'}
                                    disabled={!canSyncWithSerasa(contract)}
                                    loading={syncWithSerasaMutation.isPending && syncWithSerasaMutation.variables === contract.id}
                                    onClick={() => handleSyncWithSerasa(contract)}
                                  >
                                    <LuRefreshCw />
                                  </Button>
                                )}
                                {canRemoveFromSerasa(contract) && (
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    colorPalette="red"
                                    aria-label="Remover da Serasa"
                                    title="Remover da Serasa"
                                    loading={removeFromSerasaMutation.isPending && removeFromSerasaMutation.variables === contract.id}
                                    onClick={() => removeFromSerasaMutation.mutate(contract.id)}
                                  >
                                    <LuUnlink />
                                  </Button>
                                )}
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  aria-label="Iniciar ligação com IA"
                                  title={contract.debtorPhone ? 'Iniciar ligação com IA' : 'Contrato sem telefone cadastrado'}
                                  disabled={!contract.debtorPhone || contract.status !== 'ACTIVE' || contract.paymentStatus === 'PAID'}
                                  onClick={() => {
                                    setLigueLeadContractId(contract.id);
                                    setShowLigueLead(true);
                                  }}
                                >
                                  <LuPhoneCall />
                                </Button>
                              </HStack>
                            </Table.Cell>
                          )}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Table.ScrollArea>

                {contractsData.meta && contractsData.meta.totalPages > 1 && (
                  <PaginationBar
                    page={contractsPage}
                    totalPages={contractsData.meta.totalPages}
                    pageSize={20}
                    onChange={setContractsPage}
                  />
                )}
              </Stack>
            )}
          </Card.Body>
        </Card.Root>
      </Stack>

      {/* Edit Wallet Dialog */}
      <WalletFormDialog
        open={showEditForm}
        onOpenChange={setShowEditForm}
        wallet={wallet}
        onSubmit={handleEditWallet}
        loading={updateWalletMutation.isPending}
      />
      <LigueLeadDialog
        open={showLigueLead}
        onOpenChange={(open) => {
          setShowLigueLead(open);
          if (!open) setLigueLeadContractId(undefined);
        }}
        walletId={id!}
        contracts={contractsData?.data ?? []}
        initialContractId={ligueLeadContractId}
        initialTab={ligueLeadContractId ? 'calls' : 'agent'}
      />

      <ContractFormDialog
        open={showContractForm}
        onOpenChange={setShowContractForm}
        onSubmit={(data) => handleCreateContract(data as CreateContractDto)}
        loading={createContractMutation.isPending}
        defaultWalletId={id}
      />
      <ContractFormDialog
        open={!!editingContract}
        onOpenChange={(open) => {
          if (!open) setEditingContract(null);
        }}
        contract={editingContract}
        onSubmit={(data) => handleUpdateContract(data as UpdateContractDto)}
        loading={updateContractMutation.isPending}
      />
      <ConfirmDialog
        open={!!bulkAction}
        onOpenChange={(open) => !open && setBulkAction(null)}
        title={bulkAction === OperationAction.REMOVE ? 'Remover carteira do Serasa' : 'Enviar carteira ao Serasa'}
        message={bulkPreviewLoading
          ? 'Calculando os contratos elegíveis...'
          : bulkAction === OperationAction.REMOVE
            ? `Serão removidos ${bulkPreview?.eligibleCount ?? 0} contrato(s) elegível(is) da Serasa. Deseja continuar?`
            : `Serão enviados ${bulkPreview?.eligibleCount ?? 0} contrato(s) elegível(is) para a carteira Serasa vinculada. Deseja continuar?`}
        confirmLabel={bulkAction === OperationAction.REMOVE ? 'Remover' : 'Enviar'}
        loading={createOperationMutation.isPending || bulkPreviewLoading}
        onConfirm={() => {
          if (!id || !bulkAction) return;
          createOperationMutation.mutate(
            { walletId: id, action: bulkAction, filters: operationFilters },
            { onSuccess: () => setBulkAction(null) },
          );
        }}
      />
      <Dialog.Root open={transferOpen} onOpenChange={(event) => !event.open && setTransferOpen(false)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header><Dialog.Title>Transferir contratos filtrados</Dialog.Title></Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <Text>
                    Serão transferidos os {contractsData?.meta.total ?? 0} contrato(s) encontrados pelos filtros atuais.
                    Contratos ainda sincronizados com a Serasa não serão transferidos.
                  </Text>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={destinationWalletId} onChange={(event) => setDestinationWalletId(event.target.value)}>
                      <option value="">Selecione a carteira de destino</option>
                      {destinationWallets.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  {!destinationWallets.length && <Text fontSize="sm" color="fg.muted">Não há outra carteira ativa deste credor disponível como destino.</Text>}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack>
                  <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancelar</Button>
                  <Button
                    colorPalette="blue"
                    disabled={!destinationWalletId}
                    loading={bulkTransferMutation.isPending}
                    onClick={() => id && bulkTransferMutation.mutate(
                      { sourceWalletId: id, destinationWalletId, filters: operationFilters },
                      { onSuccess: () => setTransferOpen(false) },
                    )}
                  >
                    Transferir contratos
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
