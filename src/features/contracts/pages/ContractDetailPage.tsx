import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Portal,
} from '@chakra-ui/react';
import { LuArrowLeft, LuMessageSquare, LuVolume2 } from 'react-icons/lu';
import { useContractInteractionsQuery, useContractQuery } from '../api/useContractsQuery';
import { DataTable, PageHeader } from '@/components/common';
import type { ContractInteraction } from '@/types/models';
import api from '@/lib/api';

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
  const navigate = useNavigate();
  const { data: contract, isLoading } = useContractQuery(id!);
  const { data: interactions = [], isLoading: isLoadingInteractions } = useContractInteractionsQuery(id!);
  const [selectedInteraction, setSelectedInteraction] = useState<ContractInteraction | null>(null);

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

  return (
    <Stack gap="4">
      <HStack>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/wallets/${contract.walletId}`)}>
          <LuArrowLeft /> Voltar
        </Button>
      </HStack>

      <PageHeader title={`Contrato ${contract.contractNumber}`} />

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
              <Badge>{contract.status}</Badge>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Situação financeira</Text>
              <Badge>{contract.paymentStatus}</Badge>
            </Stack>
            <Stack gap="0">
              <Text fontSize="xs" color="fg.muted">Serasa</Text>
              <Badge>{contract.serasaStatus}</Badge>
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

      {/* Card 5: Carteira */}
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
    </Stack>
  );
}
