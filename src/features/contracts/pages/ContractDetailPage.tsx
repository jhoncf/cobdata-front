import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Stack,
  HStack,
  Text,
  Spinner,
  Button,
  Card,
  Heading,
  Badge,
  Box,
  CloseButton,
  Dialog,
  Menu,
  Portal,
} from '@chakra-ui/react';
import { LuEllipsis, LuMessageSquare, LuPencil, LuRefreshCw, LuUnlink, LuVolume2 } from 'react-icons/lu';
import { useContractInteractionsQuery, useContractQuery } from '../api/useContractsQuery';
import { useRemoveContractFromSerasaMutation, useSyncContractWithSerasaMutation, useUpdateContractMutation } from '../api/useContractMutations';
import { ContractFormDialog } from '../components/ContractFormDialog';
import { ConfirmDialog, DataTable, PageHeader, StatusBadge } from '@/components/common';
import type { ContractInteraction } from '@/types/models';
import type { UpdateContractDto } from '@/types/api';
import { CONTRACT_STATUS_LABELS, PAYMENT_STATUS_LABELS, PROVIDER_STATUS_LABELS } from '@/lib/constants';
import api from '@/lib/api';
import { toaster } from '@/components/ui/toaster';

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const channelLabels: Record<ContractInteraction['channel'], string> = {
  AI_VOICE_CALL: 'Ligação com IA',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  SERASA: 'Serasa',
};

const statusLabels: Record<ContractInteraction['status'], string> = {
  QUEUED: 'Na fila', SENT: 'Enviado', DELIVERED: 'Entregue', READ: 'Lido',
  ANSWERED: 'Atendido', COMPLETED: 'Concluído', FAILED: 'Falhou',
  NO_ANSWER: 'Não atendido', REJECTED: 'Recusado',
};

interface TranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
}

function transcriptMessages(conversation: unknown): TranscriptMessage[] {
  if (!conversation || typeof conversation !== 'object' || !Array.isArray((conversation as { messages?: unknown }).messages)) return [];
  return (conversation as { messages: unknown[] }).messages.filter(
    (message): message is TranscriptMessage => Boolean(
      message
      && typeof message === 'object'
      && (((message as TranscriptMessage).role === 'assistant') || ((message as TranscriptMessage).role === 'user'))
      && typeof (message as TranscriptMessage).content === 'string',
    ),
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contract, isLoading } = useContractQuery(id!);
  const { data: interactions = [], isLoading: isLoadingInteractions } = useContractInteractionsQuery(id!);
  const [selectedInteraction, setSelectedInteraction] = useState<ContractInteraction | null>(null);
  const [editingContract, setEditingContract] = useState(false);
  const [serasaAction, setSerasaAction] = useState<'sync' | 'remove' | null>(null);
  const updateContractMutation = useUpdateContractMutation();
  const syncWithSerasaMutation = useSyncContractWithSerasaMutation();
  const removeFromSerasaMutation = useRemoveContractFromSerasaMutation();

  const downloadRecording = async (interaction: ContractInteraction) => {
    const response = await api.get(`/contracts/${id}/interactions/${interaction.id}/recording`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ligacao-${new Date(interaction.occurredAt).toISOString()}.wav`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (!contract) {
    return <Text>Contrato não encontrado.</Text>;
  }

  const canSyncWithSerasa = ['NOT_ENABLED', 'PENDING', 'FAILED', 'REMOVED'].includes(contract.serasaStatus)
    && contract.status === 'ACTIVE'
    && contract.paymentStatus !== 'PAID';
  const canRemoveFromSerasa = ['SENT', 'REGISTERED', 'UPDATED'].includes(contract.serasaStatus);

  const requestSerasaAction = (action: 'sync' | 'remove') => {
    setSerasaAction(action);
  };

  const confirmSerasaAction = () => {
    if (!serasaAction) return;
    const mutation = serasaAction === 'sync' ? syncWithSerasaMutation : removeFromSerasaMutation;
    mutation.mutate(contract.id, { onSuccess: () => setSerasaAction(null) });
  };

  const handleUpdateContract = (data: UpdateContractDto) => {
    updateContractMutation.mutate(
      { id: contract.id, data },
      { onSuccess: () => setEditingContract(false) },
    );
  };

  return (
    <Stack gap="4">
      <HStack>
      </HStack>

      <PageHeader title={`Contrato ${contract.contractNumber}`}>
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button size="sm" colorPalette="blue"><LuEllipsis /> Ações</Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="edit" onClick={() => setEditingContract(true)}>
                  <LuPencil /> Editar contrato
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item
                  value="sync-serasa"
                  disabled={!canSyncWithSerasa}
                  onClick={() => requestSerasaAction('sync')}
                >
                  <LuRefreshCw /> Adicionar ao Serasa
                </Menu.Item>
                <Menu.Item
                  value="remove-serasa"
                  color="fg.error"
                  disabled={!canRemoveFromSerasa}
                  onClick={() => requestSerasaAction('remove')}
                >
                  <LuUnlink /> Remover do Serasa
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </PageHeader>

      {/* Card 1: Dados do Devedor */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Dados do Devedor</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Nome</Text>
              <Text>{contract.debtorName ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">CPF</Text>
              <Text>{formatCPF(contract.debtorDocument)}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Telefone</Text>
              <Text>{contract.debtorPhone ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">E-mail</Text>
              <Text>{contract.debtorEmail ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Endereço</Text>
              <Text>
                {[contract.debtorStreet, contract.debtorCity].filter(Boolean).join(', ') || '—'}
              </Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 2: Dados do Contrato */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Dados do Contrato</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Nº Contrato</Text>
              <Text>{contract.contractNumber}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Tipo de Dívida</Text>
              <Text>{contract.debtType}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Data de Ocorrência</Text>
              <Text>{formatDate(contract.occurrenceDate)}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Data de Vencimento</Text>
              <Text>{contract.dueDate ? formatDate(contract.dueDate) : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Aging</Text>
              <Text>{contract.agingDays} dias</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Origem da Dívida</Text>
              <Text>{contract.debtOrigin ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Produto</Text>
              <Text>{contract.productName ?? '—'}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 3: Valores */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Valores</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Valor Original</Text>
              <Text>{formatCurrency(contract.originalValue)}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Valor Atualizado</Text>
              <Text>{contract.updatedValue != null ? formatCurrency(contract.updatedValue) : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Valor da oferta</Text>
              <Text>{contract.offerValue != null ? formatCurrency(contract.offerValue) : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Desconto aplicado</Text>
              <Text>{contract.offerDiscountPercent != null ? `${contract.offerDiscountPercent}%` : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Desconto máximo permitido</Text>
              <Text>{contract.maximumDiscountPercent != null ? `${contract.maximumDiscountPercent}%` : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Repasse previsto ao credor</Text>
              <Text>{contract.repasseValue != null ? formatCurrency(contract.repasseValue) : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Comissão CobCom prevista</Text>
              <Text>{contract.commissionValue != null ? formatCurrency(contract.commissionValue) : '—'}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 4: Status */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Status</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Situação administrativa</Text>
              <StatusBadge status={contract.status} label={CONTRACT_STATUS_LABELS[contract.status]} />
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Situação financeira</Text>
              <StatusBadge status={contract.paymentStatus} label={PAYMENT_STATUS_LABELS[contract.paymentStatus]} />
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Serasa</Text>
              <StatusBadge status={contract.serasaStatus} label={PROVIDER_STATUS_LABELS[contract.serasaStatus]} />
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Debt ID Serasa</Text>
              <Text fontFamily="mono" fontSize="sm">{contract.debtId ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Negativado</Text>
              <Text>{contract.isNegativated ? 'Sim' : 'Não'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Cancelado em</Text>
              <Text>{contract.cancelledAt ? formatDate(contract.cancelledAt) : '—'}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 5: Acordo e pagamentos */}
      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Acordo e pagamentos</Heading>
          <HStack gap="8" wrap="wrap">
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Referência do acordo</Text>
              <Text>{contract.agreementReference ?? '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Valor do acordo</Text>
              <Text>{contract.agreementTotalAmount != null ? formatCurrency(contract.agreementTotalAmount) : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Prazo para pagamento</Text>
              <Text>{contract.agreementDueAt ? formatDate(contract.agreementDueAt) : '—'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Parcelas</Text>
              <Text>{contract.totalInstallments ? `${contract.paidInstallments}/${contract.totalInstallments} pagas` : 'À vista'}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Total pago</Text>
              <Text>{formatCurrency(contract.totalPaidAmount)}</Text>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Último pagamento</Text>
              <Text>{contract.lastPaymentAt ? formatDate(contract.lastPaymentAt) : '—'}</Text>
            </Stack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Card 6: Carteira */}
      {contract.wallet && (
        <Card.Root>
          <Card.Body gap="3">
            <Heading size="sm">Carteira</Heading>
            <HStack gap="8" wrap="wrap">
              <Stack gap="0">
                <Text fontSize="xs" color="fg.muted">Carteira</Text>
                <Text>{contract.wallet.name}</Text>
              </Stack>
              {contract.wallet.creditor && (
                <Stack gap="0">
                  <Text fontSize="xs" color="fg.muted">Credor</Text>
                  <Text>{contract.wallet.creditor.name}</Text>
                </Stack>
              )}
            </HStack>
          </Card.Body>
        </Card.Root>
      )}

      <Card.Root>
        <Card.Body gap="3">
          <Heading size="sm">Histórico de interações</Heading>
          <DataTable<ContractInteraction>
            loading={isLoadingInteractions}
            data={interactions}
            keyExtractor={(interaction) => interaction.id}
            columns={[
              { key: 'channel', header: 'Canal', cell: (interaction) => channelLabels[interaction.channel] },
              { key: 'status', header: 'Status', cell: (interaction) => <Badge>{statusLabels[interaction.status]}</Badge> },
              { key: 'summary', header: 'Resumo', minW: '260px', cell: (interaction) => (
                <Stack gap="1">
                  <Text>{interaction.summary ?? '—'}</Text>
                  {transcriptMessages(interaction.conversation).length > 0 && (
                    <Button size="xs" variant="outline" alignSelf="start" onClick={() => setSelectedInteraction(interaction)}>
                      <LuMessageSquare /> Ver conversa
                    </Button>
                  )}
                  {interaction.recordingUrl && (
                    <HStack gap="2" wrap="wrap">
                      <Button size="xs" variant="outline" asChild>
                        <a href={interaction.recordingUrl} target="_blank" rel="noreferrer"><LuVolume2 /> Ouvir gravação</a>
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => void downloadRecording(interaction)}>Baixar áudio</Button>
                    </HStack>
                  )}
                </Stack>
              ) },
              { key: 'occurredAt', header: 'Data', cell: (interaction) => new Date(interaction.occurredAt).toLocaleString('pt-BR') },
            ]}
          />
        </Card.Body>
      </Card.Root>

      <Dialog.Root open={selectedInteraction !== null} onOpenChange={(details) => { if (!details.open) setSelectedInteraction(null); }} size={{ mdDown: 'full', md: 'lg' }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Stack gap="0">
                  <Dialog.Title>Conversa da ligação</Dialog.Title>
                  <Text fontSize="sm" color="fg.muted">
                    {selectedInteraction ? new Date(selectedInteraction.occurredAt).toLocaleString('pt-BR') : ''}
                  </Text>
                </Stack>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="3" maxH="60vh" overflowY="auto" pr="1">
                  {selectedInteraction && transcriptMessages(selectedInteraction.conversation).map((message, index) => {
                    const isAgent = message.role === 'assistant';
                    return (
                      <Stack key={`${message.role}-${index}`} gap="1" alignItems={isAgent ? 'flex-start' : 'flex-end'}>
                        <Text fontSize="xs" color="fg.muted">{isAgent ? 'CobCom IA' : 'Cliente'}</Text>
                        <Box maxW="85%" px="3" py="2" rounded="lg" bg={isAgent ? 'bg.muted' : 'blue.500'} color={isAgent ? 'fg' : 'white'}>
                          <Text whiteSpace="pre-wrap">{message.content}</Text>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                {selectedInteraction?.recordingUrl && (
                  <HStack gap="2" wrap="wrap">
                    <Button variant="outline" asChild>
                      <a href={selectedInteraction.recordingUrl} target="_blank" rel="noreferrer"><LuVolume2 /> Ouvir gravação</a>
                    </Button>
                    <Button variant="outline" onClick={() => void downloadRecording(selectedInteraction)}>Baixar áudio</Button>
                  </HStack>
                )}
                <Button onClick={() => setSelectedInteraction(null)}>Fechar</Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <ContractFormDialog
        open={editingContract}
        onOpenChange={setEditingContract}
        contract={contract}
        onSubmit={handleUpdateContract}
        loading={updateContractMutation.isPending}
      />

      <ConfirmDialog
        open={serasaAction !== null}
        onOpenChange={(open) => { if (!open) setSerasaAction(null); }}
        title={serasaAction === 'sync' ? 'Adicionar contrato ao Serasa?' : 'Remover contrato do Serasa?'}
        message={serasaAction === 'sync'
          ? 'Tem certeza que deseja sincronizar este contrato com a carteira Serasa vinculada a esta carteira?'
          : 'Tem certeza que deseja solicitar a remoção deste contrato do Serasa?'}
        confirmLabel={serasaAction === 'sync' ? 'Sincronizar' : 'Remover'}
        colorPalette={serasaAction === 'sync' ? 'blue' : 'red'}
        loading={syncWithSerasaMutation.isPending || removeFromSerasaMutation.isPending}
        onConfirm={confirmSerasaAction}
      />
    </Stack>
  );
}
