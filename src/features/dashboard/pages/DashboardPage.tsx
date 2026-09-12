import { Box, Card, Heading, HStack, SimpleGrid, Text, VStack, Spinner } from '@chakra-ui/react';
import { LuUpload, LuPlay, LuWallet, LuClock, LuHandshake } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/common';
import { Button } from '@chakra-ui/react';
import { useDashboardTodayQuery } from '../api/useDashboardTodayQuery';
import { formatCurrency } from '@/lib/formatters';

export default function DashboardPage() {
  const { userName, role } = useAuth();
  const { canCreate } = usePermission();
  const navigate = useNavigate();
  const { data: today, isLoading: isLoadingToday } = useDashboardTodayQuery();

  return (
    <VStack align="stretch" gap="6">
      <PageHeader title="Dashboard" />

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

      {/* Welcome Card */}
      <Card.Root>
        <Card.Body>
          <Heading size="lg">
            Bem-vindo{userName ? `, ${userName}` : ''}!
          </Heading>
          <Text color="fg.muted" mt="1">
            Perfil: {role ?? 'Carregando...'}
          </Text>
        </Card.Body>
      </Card.Root>

      {/* Quick Actions */}
      {canCreate && (
        <Box>
          <Heading size="sm" mb="3">Ações rápidas</Heading>
          <HStack gap="3" flexWrap="wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/imports/new')}
            >
              <LuUpload />
              Importar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/operations')}
            >
              <LuPlay />
              Nova Operação
            </Button>
          </HStack>
        </Box>
      )}

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
        <Card.Root>
          <Card.Body>
            <HStack gap="3">
              <Box color="blue.500">
                <LuWallet size={24} />
              </Box>
              <Box>
                <Text fontWeight="medium">Veja suas carteiras</Text>
                <Text fontSize="sm" color="fg.muted">
                  Acesse e gerencie suas carteiras de crédito
                </Text>
              </Box>
            </HStack>
          </Card.Body>
          <Card.Footer>
            <Button size="xs" variant="ghost" onClick={() => navigate('/wallets')}>
              Ver carteiras
            </Button>
          </Card.Footer>
        </Card.Root>

        <Card.Root>
          <Card.Body>
            <HStack gap="3">
              <Box color="green.500">
                <LuClock size={24} />
              </Box>
              <Box>
                <Text fontWeight="medium">Últimas importações</Text>
                <Text fontSize="sm" color="fg.muted">
                  Acompanhe o status das suas importações recentes
                </Text>
              </Box>
            </HStack>
          </Card.Body>
          <Card.Footer>
            <Button size="xs" variant="ghost" onClick={() => navigate('/imports')}>
              Ver importações
            </Button>
          </Card.Footer>
        </Card.Root>
      </SimpleGrid>
    </VStack>
  );
}
