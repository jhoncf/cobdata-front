import { VStack, Heading, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <VStack py="20" gap="4" textAlign="center">
      <Heading size="2xl" color="fg.muted">
        404
      </Heading>
      <Heading size="md">Página não encontrada</Heading>
      <Text color="fg.muted" maxW="md">
        A página que você está procurando não existe ou foi movida.
      </Text>
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Voltar ao Dashboard
      </Button>
    </VStack>
  );
}
