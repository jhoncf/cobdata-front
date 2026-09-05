import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Accordion,
  Button,
  Card,
  Dialog,
  Flex,
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
  Tooltip,
} from '@chakra-ui/react';
import { LuUpload, LuPlus, LuPencil, LuArrowUp, LuArrowDown, LuRadio, LuPhoneCall, LuEye, LuRefreshCw, LuUnlink, LuEllipsis, LuCalculator, LuInfo } from 'react-icons/lu';
import { PageHeader, StatusBadge, LoadingOverlay, PaginationBar, EmptyState, ConfirmDialog } from '@/components/common';
import { useWalletDetailQuery } from '../api/useWalletDetailQuery';
import { useRecalculateWalletOffersMutation, useUpdateWalletMutation } from '../api/useWalletMutations';
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
import { CONTRACT_STATUS_LABELS, PAYMENT_STATUS_LABELS, PROVIDER_STATUS_LABELS } from '@/lib/constants';
import { usePermission } from '@/hooks/usePermission';
import { useAllWalletsQuery } from '../api/useWalletsQuery';
import { ContractStatus, OperationAction, SerasaStatus, type PaymentStatus } from '@/types/enums';
import type { CreateContractDto, OperationContractFilters, UpdateContractDto, UpdateWalletDto } from '@/types/api';
import type { Contract } from '@/types/models';

type SortField = 'contractNumber' | 'debtorDocument' | 'originalValue' | 'updatedValue' | 'offerValue' | 'status' | 'paymentStatus' | 'serasaStatus' | 'occurrenceDate' | 'agingDays';
type SortDirection = 'asc' | 'desc';
type ComparisonOperator = 'gt' | 'lt' | 'eq';
type SerasaStatusFilter = SerasaStatus | 'SYNCED';

function ComparisonFilter({
  label, operator, value, unit, onOperatorChange, onValueChange,
}: {
  label: string;
  operator: ComparisonOperator;
  value: string;
  unit: string;
  onOperatorChange: (value: ComparisonOperator) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <HStack gap="2" width="100%" minWidth="0">
      <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">{label}</Text>
      <NativeSelect.Root size="sm" width="112px" flexShrink="0">
        <NativeSelect.Field value={operator} onChange={(event) => onOperatorChange(event.target.value as ComparisonOperator)} aria-label={`Operador de ${label}`}>
          <option value="gt">Maior que</option>
          <option value="lt">Menor que</option>
          <option value="eq">Igual a</option>
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      <Input size="sm" minWidth="0" flex="1" type="number" min="0" placeholder={unit} value={value} onChange={(event) => onValueChange(event.target.value)} aria-label={`${label} ${unit}`} />
    </HStack>
  );
}

function SummaryTooltipLabel({ label, description }: { label: string; description: string }) {
  return (
    <Tooltip.Root positioning={{ placement: 'top' }} openDelay={150}>
      <Tooltip.Trigger asChild>
        <HStack gap="1" width="fit-content" cursor="help" tabIndex={0} aria-label={`${label}: ${description}`}>
          <Stat.Label>{label}</Stat.Label>
          <LuInfo size={14} aria-hidden="true" />
        </HStack>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content maxW="300px" fontSize="xs" lineHeight="tall">{description}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function TableTooltipLabel({ label, description }: { label: string; description: string }) {
  return (
    <Tooltip.Root positioning={{ placement: 'top' }} openDelay={150}>
      <Tooltip.Trigger asChild>
        <HStack gap="1" width="fit-content" cursor="help" tabIndex={0} aria-label={`${label}: ${description}`}>
          <Text as="span">{label}</Text>
          <LuInfo size={14} aria-hidden="true" />
        </HStack>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content maxW="280px" fontSize="xs" lineHeight="tall">{description}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
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
  const [contractStatusFilter, setContractStatusFilter] = useState<ContractStatus>(ContractStatus.ACTIVE);
  const [serasaStatusFilter, setSerasaStatusFilter] = useState<SerasaStatusFilter | ''>('');
  const [installmentOnly, setInstallmentOnly] = useState(false);
  const [updatedValueOperator, setUpdatedValueOperator] = useState<ComparisonOperator>('gt');
  const [updatedValue, setUpdatedValue] = useState('');
  const [offerValueOperator, setOfferValueOperator] = useState<ComparisonOperator>('gt');
  const [offerValue, setOfferValue] = useState('');
  const [agingOperator, setAgingOperator] = useState<ComparisonOperator>('gt');
  const [aging, setAging] = useState('');
  const [contractSearch, setContractSearch] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [destinationWalletId, setDestinationWalletId] = useState('');

  const operationFilters = useMemo<OperationContractFilters>(() => ({
    ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
    ...(serasaStatusFilter && serasaStatusFilter !== 'SYNCED' ? { serasaStatus: serasaStatusFilter } : {}),
    ...(installmentOnly ? { installmentOnly: true } : {}),
    ...(updatedValue ? { updatedValueOperator, updatedValue: Number(updatedValue) } : {}),
    ...(offerValue ? { offerValueOperator, offerValue: Number(offerValue) } : {}),
    ...(aging ? { agingOperator, aging: Number(aging) } : {}),
  }), [paymentStatusFilter, serasaStatusFilter, installmentOnly, updatedValueOperator, updatedValue, offerValueOperator, offerValue, agingOperator, aging]);

  const { data: wallet, isLoading, refetch: refetchWallet } = useWalletDetailQuery(id ?? '');
  const { data: contractsData, isLoading: contractsLoading, isFetching: contractsRefreshing, refetch: refetchContracts } = useContractsQuery({
    walletId: id,
    page: contractsPage,
    limit: 20,
    status: contractStatusFilter,
    ...(contractSearch.trim() ? { search: contractSearch.trim() } : {}),
    ...(serasaStatusFilter === 'SYNCED' ? { serasaStatus: 'SYNCED' } : {}),
    ...(sortField ? { sortBy: sortField, sortDirection } : {}),
    ...operationFilters,
  });
  const createContractMutation = useCreateContractMutation();
  const updateContractMutation = useUpdateContractMutation();
  const updateWalletMutation = useUpdateWalletMutation();
  const recalculateOffersMutation = useRecalculateWalletOffersMutation();
  const bulkTransferMutation = useBulkTransferContractsMutation();
  const { data: allWallets } = useAllWalletsQuery();
  const createOperationMutation = useCreateOperationMutation();
  const { data: bulkPreview, isLoading: bulkPreviewLoading, isError: bulkPreviewError } = useOperationPreviewQuery(
    id,
    bulkAction ?? undefined,
    operationFilters,
  );
  const syncWithSerasaMutation = useSyncContractWithSerasaMutation();
  const removeFromSerasaMutation = useRemoveContractFromSerasaMutation();

  const serasaStatusSummary = [
    { status: SerasaStatus.NOT_ENABLED, count: wallet?.summary?.serasaStatusTotals?.NOT_ENABLED ?? 0 },
    { status: SerasaStatus.PENDING, count: wallet?.summary?.serasaStatusTotals?.PENDING ?? 0 },
    { status: SerasaStatus.SENT, count: wallet?.summary?.serasaStatusTotals?.SENT ?? 0 },
    {
      status: SerasaStatus.REGISTERED,
      count: (wallet?.summary?.serasaStatusTotals?.REGISTERED ?? 0) + (wallet?.summary?.serasaStatusTotals?.UPDATED ?? 0),
    },
    { status: SerasaStatus.REMOVING, count: wallet?.summary?.serasaStatusTotals?.REMOVING ?? 0 },
    { status: SerasaStatus.REMOVED, count: wallet?.summary?.serasaStatusTotals?.REMOVED ?? 0 },
    { status: SerasaStatus.FAILED, count: wallet?.summary?.serasaStatusTotals?.FAILED ?? 0 },
  ];

  const refreshContracts = useCallback(async () => {
    await Promise.all([refetchContracts(), refetchWallet()]);
  }, [refetchContracts, refetchWallet]);

  const hasPendingSerasaStatus = (
    ['PENDING', 'SENT', 'REMOVING'] as SerasaStatus[]
  ).some((status) => (
    (wallet?.summary?.serasaStatusTotals?.[status] ?? 0) > 0
  ));

  useEffect(() => {
    if (!hasPendingSerasaStatus) return;

    const refreshTimer = window.setInterval(() => {
      void refreshContracts();
    }, 8_000);

    return () => window.clearInterval(refreshTimer);
  }, [hasPendingSerasaStatus, refreshContracts]);

  useEffect(() => {
    if (!id) return;
    try {
      const saved = window.sessionStorage.getItem(`wallet-contracts-sort:${id}`);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { field?: SortField; direction?: SortDirection };
      if (parsed.field) setSortField(parsed.field);
      if (parsed.direction === 'asc' || parsed.direction === 'desc') setSortDirection(parsed.direction);
    } catch {
      // A malformed session value should never prevent the table from loading.
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    window.sessionStorage.setItem(
      `wallet-contracts-sort:${id}`,
      JSON.stringify({ field: sortField, direction: sortDirection }),
    );
  }, [id, sortDirection, sortField]);
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
  const handleSyncWithSerasa = (contract: Contract) => syncWithSerasaMutation.mutate(contract.id);
  const handleBulkAction = (action: OperationAction) => {
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

  const handleEditWallet = (formData: { name: string; creditorId: string; cobcomDiscountPercent: number; offerFirstInstallmentDays: number; offerMinInstallmentValue: number; offerMaxInstallments: number; discountBands?: UpdateWalletDto['discountBands'] }) => {
    updateWalletMutation.mutate(
      { id: id!, data: { name: formData.name, cobcomDiscountPercent: formData.cobcomDiscountPercent, offerFirstInstallmentDays: formData.offerFirstInstallmentDays, offerMinInstallmentValue: formData.offerMinInstallmentValue, offerMaxInstallments: formData.offerMaxInstallments, discountBands: formData.discountBands } },
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
    setContractsPage(1);
  };

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
          {canEdit && <Button size="sm" variant="outline" onClick={() => setShowEditForm(true)}><LuPencil /> Editar</Button>}
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button size="sm" colorPalette="blue">
                <LuEllipsis /> Ações
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item value="new-contract" onClick={() => setShowContractForm(true)}><LuPlus /> Novo contrato</Menu.Item>
                  <Menu.Item value="import" asChild><RouterLink to={`/imports/new?walletId=${id}`}><LuUpload /> Importar contratos</RouterLink></Menu.Item>
                  {canEdit && <Menu.Item value="communications" onClick={() => { setLigueLeadContractId(undefined); setShowLigueLead(true); }}><LuRadio /> Comunicações</Menu.Item>}
                  {canEdit && <Menu.Separator />}
                  {canEdit && <Menu.Item value="recalculate-offers" onClick={() => recalculateOffersMutation.mutate(id!)}><LuCalculator /> Recalcular ofertas</Menu.Item>}
                  {canEdit && <Menu.Item value="sync-serasa" onClick={() => handleBulkAction(OperationAction.CREATE_OR_UPDATE)}><LuRefreshCw /> Enviar em massa ao Serasa</Menu.Item>}
                  {canEdit && <Menu.Item value="remove-serasa" color="fg.error" onClick={() => handleBulkAction(OperationAction.REMOVE)}><LuUnlink /> Remover em massa do Serasa</Menu.Item>}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
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

        <Card.Root>
          <Card.Header>
            <Card.Title>Configuração de ofertas</Card.Title>
          </Card.Header>
          <Card.Body>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="4">
              <Box><Text fontSize="sm" color="fg.muted">Desconto CobCom</Text><Text fontWeight="semibold">{wallet.cobcomDiscountPercent ?? 0}%</Text></Box>
              <Box><Text fontSize="sm" color="fg.muted">Primeiro pagamento</Text><Text fontWeight="semibold">{wallet.offerFirstInstallmentDays ?? 5} dias</Text></Box>
              <Box><Text fontSize="sm" color="fg.muted">Parcela mínima</Text><Text fontWeight="semibold">{formatCurrency(wallet.offerMinInstallmentValue ?? 0.01)}</Text></Box>
              <Box><Text fontSize="sm" color="fg.muted">Máximo de parcelas</Text><Text fontWeight="semibold">{wallet.offerMaxInstallments ?? 1}</Text></Box>
            </SimpleGrid>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Faixas de desconto da carteira</Card.Title>
            <Text fontSize="sm" color="fg.muted">
              A carteira define a estratégia; os limites comerciais do credor são o teto de cada faixa.
            </Text>
          </Card.Header>
          <Card.Body>
            {(wallet.creditor?.discountBands?.length ?? 0) > 0 ? (
              <Table.Root size="sm" variant="line">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>
                      <TableTooltipLabel label="Faixa de atraso" description="Idade da dívida em dias, calculada a partir da data de ocorrência. Define qual regra comercial será usada." />
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      <TableTooltipLabel label="Estratégia à vista" description="Desconto que esta carteira oferece para pagamento à vista. O valor entre parênteses é o teto máximo autorizado pelo credor." />
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      <TableTooltipLabel label="Estratégia parcelada" description="Desconto que esta carteira oferece em acordo parcelado. O valor entre parênteses é o teto máximo autorizado pelo credor." />
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {wallet.creditor?.discountBands?.map((ceiling) => {
                    const strategy = wallet.discountBands?.find((band) =>
                      band.minAgingDays === ceiling.minAgingDays && band.maxAgingDays === ceiling.maxAgingDays,
                    );
                    const range = ceiling.maxAgingDays == null
                      ? `${ceiling.minAgingDays}+ dias`
                      : `${ceiling.minAgingDays} a ${ceiling.maxAgingDays} dias`;
                    return (
                        <Table.Row key={`${ceiling.minAgingDays}-${ceiling.maxAgingDays ?? 'plus'}`}>
                          <Table.Cell fontWeight="medium">{range}</Table.Cell>
                        <Table.Cell>
                          {strategy?.cashStrategyDiscountPercent ?? wallet.cobcomDiscountPercent ?? 0}%
                          <Text as="span" color="fg.muted"> (teto: {ceiling.cashDiscountPercent}%)</Text>
                        </Table.Cell>
                        <Table.Cell>
                          {strategy?.installmentStrategyDiscountPercent ?? wallet.cobcomDiscountPercent ?? 0}%
                          <Text as="span" color="fg.muted"> (teto: {ceiling.installmentDiscountPercent}%)</Text>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            ) : (
              <Text color="fg.muted">Este credor ainda não possui faixas comerciais cadastradas. Configure-as no cadastro do credor para definir os limites da carteira.</Text>
            )}
          </Card.Body>
        </Card.Root>

        {/* Dashboard da Carteira */}
        {wallet.summary && (
          <Card.Root>
            <Card.Header>
              <Card.Title>Resumo da Carteira</Card.Title>
            </Card.Header>
            <Card.Body>
            <SimpleGrid columns={{ base: 2, sm: 3, xl: 6 }} gap={{ base: '4', xl: '3' }}>
                <Stat.Root minW="0">
                  <SummaryTooltipLabel label="Total de Contratos" description="Quantidade de contratos ativos e históricos da carteira. Fórmula: contagem de contratos não excluídos." />
                  <Stat.ValueText fontSize={{ base: 'xl', xl: '2xl' }} lineHeight="short">{wallet.summary.totalContracts}</Stat.ValueText>
                </Stat.Root>
                <Stat.Root minW="0">
                  <SummaryTooltipLabel label="Valor Total" description="Soma do valor atualizado de todos os contratos da carteira. Fórmula: Σ valor atualizado." />
                  <Stat.ValueText fontSize={{ base: 'lg', xl: 'xl' }} lineHeight="short" whiteSpace="nowrap">
                    {formatCurrency(wallet.summary.totalValue)}
                  </Stat.ValueText>
                </Stat.Root>
                {(['OPEN', 'PAID', 'AGREEMENT_BREACHED'] as PaymentStatus[]).map((status) => {
                  const stat = wallet.summary.paymentStatusTotals?.[status] ?? { count: 0, amount: 0 };
                  return <Stat.Root key={status} minW="0">
                    <SummaryTooltipLabel
                      label={PAYMENT_STATUS_LABELS[status]}
                      description={status === 'OPEN'
                        ? 'Contratos sem quitação ou acordo finalizado. O valor exibido é a soma dos valores atualizados desses contratos.'
                        : status === 'PAID'
                          ? 'Contratos quitados. O valor abaixo é a soma dos valores atualizados; o valor efetivamente recebido aparece em “Valor recuperado”.'
                          : 'Contratos cujo acordo não foi cumprido no prazo. O valor exibido é a soma dos valores atualizados desses contratos.'}
                    />
                    <Stat.ValueText fontSize={{ base: 'xl', xl: '2xl' }} lineHeight="short">{stat.count}</Stat.ValueText>
                    <Text fontSize="sm" color="fg.muted">{formatCurrency(stat.amount)}</Text>
                  </Stat.Root>;
                })}
                <Stat.Root minW="0">
                  <SummaryTooltipLabel label="No Serasa" description="Contratos em estados enviados, registrados, atualizados ou em remoção junto à Serasa. O valor é a soma dos valores atualizados desses contratos." />
                  <Stat.ValueText fontSize={{ base: 'xl', xl: '2xl' }} lineHeight="short">{wallet.summary.serasaTotal?.count ?? 0}</Stat.ValueText>
                  <Text fontSize="sm" color="fg.muted">{formatCurrency(wallet.summary.serasaTotal?.amount ?? 0)}</Text>
                </Stat.Root>
              </SimpleGrid>
              <SimpleGrid mt="6" columns={{ base: 1, sm: 2, xl: 4 }} gap="4">
                <Stat.Root minW="0">
                  <SummaryTooltipLabel label="Valor recuperado" description="Total já recebido. Fórmula: Σ valor pago registrado; para quitações históricas sem valor pago, usa o valor acordado, da oferta ou atualizado. Eficiência = valor recuperado ÷ valor atualizado elegível." />
                  <Stat.ValueText fontSize="xl">{formatCurrency(wallet.summary.recoveredValue ?? 0)}</Stat.ValueText>
                  <Text fontSize="sm" color="fg.muted">Eficiência: {(wallet.summary.efficiencyRate ?? 0).toLocaleString('pt-BR')}%</Text>
                </Stat.Root>
                <Stat.Root minW="0">
                  <SummaryTooltipLabel label="Repasse previsto" description="Valor esperado para repassar ao credor nos contratos ativos ainda não pagos. Por contrato: valor atualizado × (1 − desconto máximo permitido). O realizado considera contratos pagos." />
                  <Stat.ValueText fontSize="xl">{formatCurrency(wallet.summary.repasseForecastValue ?? 0)}</Stat.ValueText>
                  <Text fontSize="sm" color="fg.muted">Realizado: {formatCurrency(wallet.summary.repasseRealizedValue ?? 0)}</Text>
                </Stat.Root>
                <Stat.Root minW="0">
                  <SummaryTooltipLabel label="Comissão CobCom" description="Comissão prevista para faturamento ao credor, sem acréscimo ao valor cobrado do devedor. Por contrato: valor de repasse × percentual de comissão fixo. O realizado considera contratos pagos." />
                  <Stat.ValueText fontSize="xl">{formatCurrency(wallet.summary.commissionForecastValue ?? 0)}</Stat.ValueText>
                  <Text fontSize="sm" color="fg.muted">Realizada: {formatCurrency(wallet.summary.commissionRealizedValue ?? 0)}</Text>
                </Stat.Root>
                <Stat.Root minW="0">
                  <SummaryTooltipLabel label="Descontos nas ofertas" description="Redução total presente nas ofertas calculadas. Fórmula por contrato: máximo de (valor atualizado − valor da oferta, 0). É uma visão das ofertas, não apenas dos pagamentos concluídos." />
                  <Stat.ValueText fontSize="xl">{formatCurrency(wallet.summary.discountsConcededValue ?? 0)}</Stat.ValueText>
                  <Text fontSize="sm" color="fg.muted">Baseado nas ofertas calculadas</Text>
                </Stat.Root>
              </SimpleGrid>
            </Card.Body>
          </Card.Root>
        )}

        {wallet.summary && (
          <Card.Root>
            <Accordion.Root collapsible defaultValue={[]}>
              <Accordion.Item value="serasa-statuses" borderBottomWidth="0">
                <Accordion.ItemTrigger px="5" py="4">
                  <Flex flex="1" align="center" justify="space-between" gap="4">
                    <Box textAlign="start">
                      <Text fontWeight="semibold">Totais por status da Serasa</Text>
                      <Text fontSize="sm" color="fg.muted">Clique para visualizar a distribuição dos contratos.</Text>
                    </Box>
                    <Accordion.ItemIndicator />
                  </Flex>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>
                  <Accordion.ItemBody px="5" pb="5">
                    <SimpleGrid columns={{ base: 2, sm: 3, lg: 4, xl: 7 }} gap="3">
                      {serasaStatusSummary.map(({ status, count }) => (
                        <Box key={status} borderWidth="1px" rounded="md" p="3">
                          <StatusBadge status={status} label={PROVIDER_STATUS_LABELS[status]} />
                          <Text mt="2" fontSize="2xl" fontWeight="semibold">{count}</Text>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Accordion.ItemBody>
                </Accordion.ItemContent>
              </Accordion.Item>
            </Accordion.Root>
          </Card.Root>
        )}

        {/* Listagem de Contratos */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Contratos</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap="4" mb="5">
              <Flex
                gap="3"
                direction={{ base: 'column', md: 'row' }}
                align={{ base: 'stretch', md: 'center' }}
                justify="space-between"
              >
                <Input
                  size="sm"
                  width={{ base: '100%', md: '360px' }}
                  placeholder="Buscar CPF/CNPJ ou nº do contrato"
                  value={contractSearch}
                  onChange={(event) => { setContractSearch(event.target.value); setContractsPage(1); }}
                  aria-label="Buscar contratos da carteira"
                />
                <HStack gap="2" alignSelf={{ base: 'flex-start', md: 'auto' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refreshContracts()}
                    loading={contractsRefreshing}
                    aria-label="Atualizar tabela de contratos"
                    title="Atualizar tabela e resumo da carteira"
                  >
                    <LuRefreshCw /> Atualizar
                  </Button>
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
              </Flex>

              <Box borderTopWidth="1px" pt="4">
                <Text fontSize="sm" fontWeight="semibold" mb="3">Filtros</Text>
                <Stack gap="3">
                  <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="3">
                    <NativeSelect.Root size="sm" width="100%">
                      <NativeSelect.Field value={contractStatusFilter} onChange={(event) => { setContractStatusFilter(event.target.value as ContractStatus); setContractsPage(1); }}>
                        <option value="ACTIVE">Situação: ativos</option>
                        <option value="SUSPENDED">Situação: suspensos</option>
                        <option value="CANCELLED">Situação: cancelados</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <NativeSelect.Root size="sm" width="100%">
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
                    <NativeSelect.Root size="sm" width="100%">
                      <NativeSelect.Field value={serasaStatusFilter} onChange={(event) => { setSerasaStatusFilter(event.target.value as SerasaStatusFilter | ''); setContractsPage(1); }}>
                        <option value="">Status Serasa</option>
                        <option value="NOT_ENABLED">Não enviado</option>
                        <option value="SENT">Enviado</option>
                        <option value="SYNCED">Sincronizado</option>
                        <option value="FAILED">Falhou</option>
                        <option value="REMOVED">Removido</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <NativeSelect.Root size="sm" width="100%">
                      <NativeSelect.Field value={installmentOnly ? 'yes' : ''} onChange={(event) => { setInstallmentOnly(event.target.value === 'yes'); setContractsPage(1); }}>
                        <option value="">Todos os acordos</option>
                        <option value="yes">Parcelados</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </SimpleGrid>
                  <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="3">
                    <ComparisonFilter label="Valor atualizado" operator={updatedValueOperator} value={updatedValue} unit="R$" onOperatorChange={(value) => { setUpdatedValueOperator(value); setContractsPage(1); }} onValueChange={(value) => { setUpdatedValue(value); setContractsPage(1); }} />
                    <ComparisonFilter label="Oferta" operator={offerValueOperator} value={offerValue} unit="R$" onOperatorChange={(value) => { setOfferValueOperator(value); setContractsPage(1); }} onValueChange={(value) => { setOfferValue(value); setContractsPage(1); }} />
                    <ComparisonFilter label="Aging" operator={agingOperator} value={aging} unit="dias" onOperatorChange={(value) => { setAgingOperator(value); setContractsPage(1); }} onValueChange={(value) => { setAging(value); setContractsPage(1); }} />
                  </SimpleGrid>
                </Stack>
              </Box>
            </Stack>
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
                        <SortableHeader field="offerValue">Oferta</SortableHeader>
                        <SortableHeader field="status">Situação</SortableHeader>
                        <SortableHeader field="paymentStatus">Financeiro</SortableHeader>
                        <SortableHeader field="serasaStatus">Serasa</SortableHeader>
                        <SortableHeader field="occurrenceDate">Data Ocorrência</SortableHeader>
                        <SortableHeader field="agingDays">Aging</SortableHeader>
                        {canEdit && <Table.ColumnHeader width="190px">Ações</Table.ColumnHeader>}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {contractsData.data.map((contract) => (
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
                            {contract.offerValue != null ? (
                              <>
                                {formatCurrency(contract.offerValue)}
                                {contract.offerDiscountPercent != null && (
                                  <Text as="span" fontSize="xs" color="fg.muted"> ({contract.offerDiscountPercent}% desc.)</Text>
                                )}
                              </>
                            ) : '—'}
                          </Table.Cell>
                          <Table.Cell>
                            <StatusBadge
                              status={contract.status}
                              label={CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                            />
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
                          <Table.Cell whiteSpace="nowrap">{contract.agingDays} dias</Table.Cell>
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
                                    title={canSyncWithSerasa(contract)
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
          : bulkPreviewError
            ? 'Não foi possível calcular os contratos elegíveis. Tente novamente; se o erro persistir, verifique a integração Serasa.'
          : bulkAction === OperationAction.REMOVE
            ? `Serão removidos ${bulkPreview?.eligibleCount ?? 0} contrato(s) elegível(is) da Serasa. Deseja continuar?`
            : `Serão enviados ${bulkPreview?.eligibleCount ?? 0} contrato(s) elegível(is) para a carteira Serasa vinculada. Deseja continuar?`}
        confirmLabel={bulkAction === OperationAction.REMOVE ? 'Remover' : 'Enviar'}
        loading={createOperationMutation.isPending || bulkPreviewLoading}
        disabled={bulkPreviewLoading || bulkPreviewError || (bulkPreview?.eligibleCount ?? 0) === 0}
        onConfirm={() => {
          if (!id || !bulkAction) return;
          createOperationMutation.mutate(
            // The API receives operation filters at the top level. A nested
            // `filters` object is rejected by the backend DTO validation.
            { walletId: id, action: bulkAction, ...operationFilters },
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
