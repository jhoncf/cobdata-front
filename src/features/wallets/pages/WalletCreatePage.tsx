import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Stack,
  HStack,
  Button,
  Input,
  Card,
  Heading,
  Field,
} from '@chakra-ui/react';
import { LuArrowLeft } from 'react-icons/lu';
import { toaster } from '@/components/ui/toaster';
import { PageHeader } from '@/components/common';
import { useCreateWalletMutation } from '../api/useWalletMutations';

const walletSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
});

type WalletFormValues = z.infer<typeof walletSchema>;

export default function WalletCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateWalletMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(data: WalletFormValues) {
    try {
      await createMutation.mutateAsync(data);
      toaster.create({
        type: 'success',
        title: 'Carteira criada com sucesso',
      });
      navigate('/wallets');
    } catch {
      // Error handled by global handler
    }
  }

  return (
    <Stack gap="4">
      <HStack>
        <Button variant="ghost" size="sm" onClick={() => navigate('/wallets')}>
          <LuArrowLeft /> Voltar
        </Button>
      </HStack>

      <PageHeader title="Nova Carteira" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="4">
          <Card.Root>
            <Card.Body gap="4">
              <Heading size="sm">Dados da Carteira</Heading>
              <Field.Root invalid={!!errors.name} required maxW="400px">
                <Field.Label>Nome</Field.Label>
                <Input placeholder="Nome da carteira" {...register('name')} />
                <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
              </Field.Root>
            </Card.Body>
          </Card.Root>

          <HStack justify="flex-end">
            <Button variant="outline" onClick={() => navigate('/wallets')}>
              Cancelar
            </Button>
            <Button type="submit" colorPalette="blue" loading={isSubmitting}>
              Salvar Carteira
            </Button>
          </HStack>
        </Stack>
      </form>
    </Stack>
  );
}
