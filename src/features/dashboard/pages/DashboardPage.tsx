import { Box, Card, HStack, NativeSelect, SimpleGrid, Text, VStack, Spinner } from '@chakra-ui/react';
import { LuHandshake } from 'react-icons/lu';
import { useState } from 'react';
import { PageHeader } from '@/components/common';
import { CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { useDashboardAgreementHistoryQuery, useDashboardTodayQuery } from '../api/useDashboardTodayQuery';
import { formatCurrency } from '@/lib/formatters';
import { useCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';
import { useWalletsQuery } from '@/features/wallets/api/useWalletsQuery';

function AgreementDailyChart({ data }: { data: Array<{ date: string; count: number; amount: number; paidCount: number; breachCount: number }> }) {
  const chartData = data.map((item) => ({
    ...item,
    totalCount: item.count + item.paidCount + item.breachCount,
    label: new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }));

  return (
    <Box h={{ base: '260px', md: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 28, right: 18, left: -16, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="label" minTickGap={16} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <RechartsTooltip
            formatter={(value, name) => [name === 'Valor negociado' ? formatCurrency(Number(value)) : value, name]}
            labelFormatter={(_, items) => items[0]?.payload?.label ?? ''}
          />
          <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="totalCount" name="Acordos em geral" stroke="#475569" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="count" name="Acordos fechados" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }}>
            <LabelList dataKey="count" position="top" formatter={(value) => value || ''} fill="#1d4ed8" fontSize={11} fontWeight={700} />
          </Line>
          <Line type="monotone" dataKey="paidCount" name="Acordos pagos" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="breachCount" name="Acordos quebrados" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line dataKey="amount" name="Valor negociado" hide />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function DashboardPage() {
  const [creditorId, setCreditorId] = useState('');
  const [walletId, setWalletId] = useState('');
  const filters = { ...(creditorId ? { creditorId } : {}), ...(walletId ? { walletId } : {}) };
  const { data: creditors } = useCreditorsQuery({ page: 1, limit: 100 });
  const { data: wallets } = useWalletsQuery({ page: 1, limit: 100, ...(creditorId ? { creditorId } : {}) });
  const { data: today, isLoading: isLoadingToday } = useDashboardTodayQuery(filters);
  const { data: agreementHistory, isLoading: isLoadingAgreementHistory } = useDashboardAgreementHistoryQuery(filters);

  return (
    <VStack align="stretch" gap="6">
      <PageHeader title="Dashboard" />

      <Card.Root>
        <Card.Body>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
            <Box>
              <Text fontSize="sm" mb="1">Credor</Text>
              <NativeSelect.Root>
                <NativeSelect.Field value={creditorId} onChange={(event) => { setCreditorId(event.target.value); setWalletId(''); }}>
                  <option value="">Todos os credores</option>
                  {creditors?.data.map((creditor) => <option key={creditor.id} value={creditor.id}>{creditor.name}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
            <Box>
              <Text fontSize="sm" mb="1">Carteira</Text>
              <NativeSelect.Root>
                <NativeSelect.Field value={walletId} onChange={(event) => setWalletId(event.target.value)}>
                  <option value="">Todas as carteiras</option>
                  {wallets?.data.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          </SimpleGrid>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" gap="3" wrap="wrap">
            <Box>
              <Card.Title>Resultado de hoje</Card.Title>
              <Text fontSize="sm" color="fg.muted">Acordos gerados em {today?.date ? new Date(`${today.date}T12:00:00`).toLocaleDateString('pt-BR') : 'hoje'}.</Text>
            </Box>
            <Box color="brand.fg"><LuHandshake size={24} /></Box>
          </HStack>
        </Card.Header>
        <Card.Body>
          {isLoadingToday ? <Spinner size="sm" /> : (
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="5">
              <Box>
                <Text fontSize="sm" color="fg.muted">Acordos feitos</Text>
                <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight="bold">{today?.agreements.count ?? 0}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Valor negociado</Text>
                <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">{formatCurrency(today?.agreements.amount ?? 0)}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">Acordos quebrados</Text>
                <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight="bold">{today?.breachedAgreements.count ?? 0}</Text>
                <Text fontSize="xs" color="fg.muted">{formatCurrency(today?.breachedAgreements.amount ?? 0)} · total acumulado</Text>
              </Box>
            </SimpleGrid>
          )}
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Acordos nos últimos 30 dias</Card.Title>
          <Text fontSize="sm" color="fg.muted">Acordos fechados, pagos e quebrados dentro do filtro selecionado.</Text>
        </Card.Header>
        <Card.Body>
          {isLoadingAgreementHistory ? <Spinner size="sm" /> : <AgreementDailyChart data={agreementHistory?.data ?? []} />}
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
