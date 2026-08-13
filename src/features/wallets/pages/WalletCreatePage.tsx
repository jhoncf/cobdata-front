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
  NativeSelect,
} from '@chakra-ui/react';
import { LuArrowLeft } from 'react-icons/lu';
import { toaster } from '@/components/ui/toaster';
import { PageHeader } from '@/components/common';
import { useCreateWalletMutation } from '../api/useWalletMutations';
import { useCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';

const walletSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  creditorId: z.string().min(1, 'Selecione um credor'),
});

type WalletFormValues = z.infer<typeof walletSchema>;

export default function WalletCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateWalletMutation();
  const { data: creditorsData } = useCreditorsQuery({ page: 1, limit: 100 });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: { name: '', creditorId: '' },
  });

  async function onSubmit(data: WalletFormValues) {
    try {
      await createMutation.mutateAsync({
        creditorId: data.creditorId,
        data: { name: data.name },
      });
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
              <Field.Root invalid={!!errors.creditorId} required maxW="400px">
                <Field.Label>Credor</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field {...register('creditorId')}>
                    <option value="">Selecione um credor</option>
                    {creditorsData?.data.map((creditor) => (
                      <option key={creditor.id} value={creditor.id}>
                        {creditor.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Field.ErrorText>{errors.creditorId?.message}</Field.ErrorText>
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
