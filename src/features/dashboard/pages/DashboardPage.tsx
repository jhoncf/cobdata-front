import { Box, Card, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { LuUpload, LuPlay, LuWallet, LuClock } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/common';
import { Button } from '@chakra-ui/react';

export default function DashboardPage() {
  const { userName, role } = useAuth();
  const { canCreate } = usePermission();
  const navigate = useNavigate();

  return (
    <VStack align="stretch" gap="6">
      <PageHeader title="Dashboard" />

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
