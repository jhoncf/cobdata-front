import { Box, Card, HStack, Input, SimpleGrid, Spinner, Table, Tabs, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { PageHeader } from '@/components/common';
import { formatCurrency } from '@/lib/formatters';
import { ReportPeriod, useReportQuery } from '../api/useReportsQueries';

type Wallet = { name: string; creditor: { name: string } };
type SerasaAgreement = { contractNumber: string; debtorName: string; agreementReference: string; agreementCreatedAt: string; agreementTotalAmount: number; totalInstallments: number | null; paidInstallments: number; paymentStatus: string; wallet: Wallet };
type PixPayment = { amount: number; paidAt: string; externalPaymentId: string; paymentCharge: { attributedChannel: string | null } | null; contract: { contractNumber: string; debtorName: string; wallet: Wallet } };
type Communication = { channel: string; status: string; contact: string | null; summary: string | null; occurredAt: string; contract: { contractNumber: string; debtorName: string; wallet: Wallet } };
type ListReport<T> = { total: number; amount?: number; data: T[] };

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);
const initialPeriod = (): ReportPeriod => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
};

const labelChannel: Record<string, string> = { SMS: 'SMS', EMAIL: 'E-mail', AI_VOICE_CALL: 'Ligação IA' };
const labelStatus: Record<string, string> = { READ: 'Lida', ANSWERED: 'Atendida' };

function ReportHeader({ period, onChange }: { period: ReportPeriod; onChange: (period: ReportPeriod) => void }) {
  return (
    <HStack gap="3" wrap="wrap" align="end">
      <Box>
        <Text fontSize="sm" mb="1">Data inicial</Text>
        <Input aria-label="Data inicial" type="date" value={period.startDate} onChange={(event) => onChange({ ...period, startDate: event.target.value })} />
      </Box>
      <Box>
        <Text fontSize="sm" mb="1">Data final</Text>
        <Input aria-label="Data final" type="date" value={period.endDate} onChange={(event) => onChange({ ...period, endDate: event.target.value })} />
      </Box>
    </HStack>
  );
}

function Summary({ total, amount, label }: { total: number; amount?: number; label: string }) {
  return <SimpleGrid columns={{ base: 1, sm: amount === undefined ? 1 : 2 }} gap="4" mb="5"><Box><Text fontSize="sm" color="fg.muted">{label}</Text><Text fontSize="2xl" fontWeight="bold">{total}</Text></Box>{amount !== undefined && <Box><Text fontSize="sm" color="fg.muted">Valor total</Text><Text fontSize="2xl" fontWeight="bold">{formatCurrency(amount)}</Text></Box>}</SimpleGrid>;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod);
  const agreements = useReportQuery<ListReport<SerasaAgreement>>('serasa-agreements', period);
  const pix = useReportQuery<ListReport<PixPayment>>('pix-payments', period);
  const communications = useReportQuery<ListReport<Communication>>('communications', period);
  const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR');

  return <VStack align="stretch" gap="6">
    <PageHeader title="Relatórios" />
    <Card.Root><Card.Body><ReportHeader period={period} onChange={setPeriod} /><Text mt="3" fontSize="sm" color="fg.muted">O período inicia, por padrão, nos últimos 30 dias.</Text></Card.Body></Card.Root>
    <Tabs.Root defaultValue="agreements" lazyMount>
      <Tabs.List overflowX="auto"><Tabs.Trigger value="agreements">Acordos Serasa</Tabs.Trigger><Tabs.Trigger value="pix">Pix CobCom</Tabs.Trigger><Tabs.Trigger value="communications">Comunicações vistas</Tabs.Trigger><Tabs.Indicator /></Tabs.List>
      <Tabs.Content value="agreements"><Card.Root><Card.Body>{agreements.isLoading ? <Spinner /> : <><Summary total={agreements.data?.total ?? 0} amount={agreements.data?.amount ?? 0} label="Acordos fechados" /><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>Data</Table.ColumnHeader><Table.ColumnHeader>Credor</Table.ColumnHeader><Table.ColumnHeader>Carteira</Table.ColumnHeader><Table.ColumnHeader>Contrato</Table.ColumnHeader><Table.ColumnHeader>Acordo</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Valor</Table.ColumnHeader><Table.ColumnHeader>Parcelas</Table.ColumnHeader></Table.Row></Table.Header><Table.Body>{agreements.data?.data.map((row) => <Table.Row key={`${row.contractNumber}-${row.agreementReference}`}><Table.Cell>{formatDate(row.agreementCreatedAt)}</Table.Cell><Table.Cell>{row.wallet.creditor.name}</Table.Cell><Table.Cell>{row.wallet.name}</Table.Cell><Table.Cell>{row.contractNumber}</Table.Cell><Table.Cell>{row.agreementReference}</Table.Cell><Table.Cell textAlign="end">{formatCurrency(row.agreementTotalAmount)}</Table.Cell><Table.Cell>{row.paidInstallments}/{row.totalInstallments ?? 1}</Table.Cell></Table.Row>)}</Table.Body></Table.Root></>}</Card.Body></Card.Root></Tabs.Content>
      <Tabs.Content value="pix"><Card.Root><Card.Body>{pix.isLoading ? <Spinner /> : <><Summary total={pix.data?.total ?? 0} amount={pix.data?.amount ?? 0} label="Pagamentos Pix confirmados" /><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>Data</Table.ColumnHeader><Table.ColumnHeader>Credor</Table.ColumnHeader><Table.ColumnHeader>Carteira</Table.ColumnHeader><Table.ColumnHeader>Contrato</Table.ColumnHeader><Table.ColumnHeader>Canal</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Valor pago</Table.ColumnHeader></Table.Row></Table.Header><Table.Body>{pix.data?.data.map((row) => <Table.Row key={row.externalPaymentId}><Table.Cell>{formatDate(row.paidAt)}</Table.Cell><Table.Cell>{row.contract.wallet.creditor.name}</Table.Cell><Table.Cell>{row.contract.wallet.name}</Table.Cell><Table.Cell>{row.contract.contractNumber}</Table.Cell><Table.Cell>{row.paymentCharge?.attributedChannel ?? 'CobCom'}</Table.Cell><Table.Cell textAlign="end">{formatCurrency(row.amount)}</Table.Cell></Table.Row>)}</Table.Body></Table.Root></>}</Card.Body></Card.Root></Tabs.Content>
      <Tabs.Content value="communications"><Card.Root><Card.Body>{communications.isLoading ? <Spinner /> : <><Summary total={communications.data?.total ?? 0} label="Comunicações lidas ou atendidas" /><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>Data</Table.ColumnHeader><Table.ColumnHeader>Canal</Table.ColumnHeader><Table.ColumnHeader>Status</Table.ColumnHeader><Table.ColumnHeader>Credor</Table.ColumnHeader><Table.ColumnHeader>Contrato</Table.ColumnHeader><Table.ColumnHeader>Contato</Table.ColumnHeader><Table.ColumnHeader>Mensagem</Table.ColumnHeader></Table.Row></Table.Header><Table.Body>{communications.data?.data.map((row, index) => <Table.Row key={`${row.contract.contractNumber}-${row.occurredAt}-${index}`}><Table.Cell>{formatDate(row.occurredAt)}</Table.Cell>{<Table.Cell>{labelChannel[row.channel] ?? row.channel}</Table.Cell>}<Table.Cell>{labelStatus[row.status] ?? row.status}</Table.Cell><Table.Cell>{row.contract.wallet.creditor.name}</Table.Cell><Table.Cell>{row.contract.contractNumber}</Table.Cell><Table.Cell>{row.contact ?? '—'}</Table.Cell><Table.Cell>{row.summary ?? '—'}</Table.Cell></Table.Row>)}</Table.Body></Table.Root></>}</Card.Body></Card.Root></Tabs.Content>
    </Tabs.Root>
  </VStack>;
}
