import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Input,
  Stack,
  Field,
  NativeSelect,
} from '@chakra-ui/react';
import { useCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';
import { useProvidersQuery } from '@/features/providers/api/useProvidersQuery';
import type { Wallet } from '@/types/models';

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  SERASA_LNOP: 'Serasa LNOP',
};

const walletSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Máximo 120 caracteres'),
  creditorId: z.string().min(1, 'Selecione um credor'),
  providerId: z.string().optional(),
});

type WalletFormValues = z.infer<typeof walletSchema>;

interface WalletFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: Wallet | null;
  /** Pre-selected providerId for edit mode (from wallet mappings) */
  currentProviderId?: string;
  onSubmit: (data: { name: string; creditorId: string; providerId?: string }) => void;
  loading?: boolean;
}

export function WalletFormDialog({
  open,
  onOpenChange,
  wallet,
  currentProviderId,
  onSubmit,
  loading = false,
}: WalletFormDialogProps) {
  const isEdit = !!wallet;

  const { data: creditorsData } = useCreditorsQuery({ page: 1, limit: 100 });
  const { data: providersData } = useProvidersQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: { name: '', creditorId: '', providerId: '' },
  });

  useEffect(() => {
    if (open) {
      if (wallet) {
        reset({
          name: wallet.name,
          creditorId: wallet.creditorId,
          providerId: currentProviderId ?? '',
        });
      } else {
        reset({ name: '', creditorId: '', providerId: '' });
      }
    }
  }, [open, wallet, currentProviderId, reset]);

  const handleFormSubmit = (values: WalletFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size={{ mdDown: 'full', md: 'md' }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {isEdit ? 'Editar Carteira' : 'Nova Carteira'}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="wallet-form" onSubmit={handleSubmit(handleFormSubmit)}>
                <Stack gap="4">
                  <Field.Root invalid={!!errors.name} required>
                    <Field.Label>Nome</Field.Label>
                    <Input {...register('name')} />
                    <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
                  </Field.Root>

                  <Field.Root invalid={!!errors.creditorId} required>
                    <Field.Label>Credor</Field.Label>
                    {isEdit ? (
                      <>
                        <Input
                          value={wallet?.creditor?.name ?? 'Credor atual'}
                          readOnly
                          aria-label="Credor da carteira"
                        />
                        <input type="hidden" {...register('creditorId')} />
                      </>
                    ) : (
                      <NativeSelect.Root>
                        <NativeSelect.Field {...register('creditorId')}>
                          <option value="">Selecione um credor</option>
                          {creditorsData?.data.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    )}
                    <Field.ErrorText>
                      {errors.creditorId?.message}
                    </Field.ErrorText>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Canal</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field {...register('providerId')}>
                        <option value="">Nenhum (sem canal)</option>
                        {providersData?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {PROVIDER_TYPE_LABELS[p.type] ?? p.type} ({p.environment === 'PRODUCTION' ? 'Produção' : 'Homologação'})
                          </option>
                        ))}
                      </NativeSelect.Field>
                    <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                </Stack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="blue"
                type="submit"
                form="wallet-form"
                loading={loading}
              >
                {isEdit ? 'Salvar' : 'Criar'}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
