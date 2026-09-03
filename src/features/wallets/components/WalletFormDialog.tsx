import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
  SimpleGrid,
  Box,
  Text,
} from '@chakra-ui/react';
import { useCreditorsQuery } from '@/features/creditors/api/useCreditorsQuery';
import type { Wallet } from '@/types/models';

const walletSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(120, 'Máximo 120 caracteres'),
  creditorId: z.string().min(1, 'Selecione um credor'),
  cobcomDiscountPercent: z.coerce.number().min(0).max(100),
  offerFirstInstallmentDays: z.coerce.number().int().min(1).max(365),
  offerMinInstallmentValue: z.coerce.number().min(0.01),
  offerMaxInstallments: z.coerce.number().int().min(1).max(999),
  discountBands: z.array(z.object({
    minAgingDays: z.coerce.number().int().min(0),
    maxAgingDays: z.coerce.number().int().min(0).nullable(),
    cashDiscountPercent: z.coerce.number().min(0).max(100),
    installmentDiscountPercent: z.coerce.number().min(0).max(100),
  })),
});

type WalletFormValues = z.infer<typeof walletSchema>;

interface WalletFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: Wallet | null;
  onSubmit: (data: { name: string; creditorId: string; cobcomDiscountPercent: number; offerFirstInstallmentDays: number; offerMinInstallmentValue: number; offerMaxInstallments: number; discountBands?: WalletFormValues['discountBands'] }) => void;
  loading?: boolean;
}

export function WalletFormDialog({
  open,
  onOpenChange,
  wallet,
  onSubmit,
  loading = false,
}: WalletFormDialogProps) {
  const isEdit = !!wallet;

  const { data: creditorsData } = useCreditorsQuery({ page: 1, limit: 100 });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: { name: '', creditorId: '', cobcomDiscountPercent: 0, offerFirstInstallmentDays: 5, offerMinInstallmentValue: 0.01, offerMaxInstallments: 1, discountBands: [] },
  });
  const { fields } = useFieldArray({ control, name: 'discountBands' });

  useEffect(() => {
    if (open) {
      if (wallet) {
        reset({
          name: wallet.name,
          creditorId: wallet.creditorId,
          cobcomDiscountPercent: wallet.cobcomDiscountPercent ?? 0,
          offerFirstInstallmentDays: wallet.offerFirstInstallmentDays ?? 5,
          offerMinInstallmentValue: wallet.offerMinInstallmentValue ?? 0.01,
          offerMaxInstallments: wallet.offerMaxInstallments ?? 1,
          discountBands: (wallet.creditor?.discountBands ?? []).map((ceiling) => {
            const strategy = wallet.discountBands?.find((band) =>
              band.minAgingDays === ceiling.minAgingDays && band.maxAgingDays === ceiling.maxAgingDays,
            );
            return {
              minAgingDays: ceiling.minAgingDays,
              maxAgingDays: ceiling.maxAgingDays,
              cashDiscountPercent: strategy?.cashStrategyDiscountPercent ?? wallet.cobcomDiscountPercent ?? 0,
              installmentDiscountPercent: strategy?.installmentStrategyDiscountPercent ?? wallet.cobcomDiscountPercent ?? 0,
            };
          }),
        });
      } else {
        reset({ name: '', creditorId: '', cobcomDiscountPercent: 0, offerFirstInstallmentDays: 5, offerMinInstallmentValue: 0.01, offerMaxInstallments: 1, discountBands: [] });
      }
    }
  }, [open, wallet, reset]);

  const handleFormSubmit = (values: WalletFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size={{ mdDown: 'full', md: 'xl' }}
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
            <Dialog.Body maxH={{ md: 'calc(100dvh - 11rem)' }} overflowY="auto">
              <form id="wallet-form" onSubmit={handleSubmit(handleFormSubmit)}>
                <Stack gap="4">
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
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
                  </SimpleGrid>

                  <Field.Root invalid={!!errors.cobcomDiscountPercent}>
                    <Field.Label>Desconto CobCom (%)</Field.Label>
                    <Input type="number" min="0" max="100" step="0.01" {...register('cobcomDiscountPercent')} />
                    <Field.HelperText>Aplicado ao valor atualizado para calcular a oferta de cada contrato.</Field.HelperText>
                    <Field.ErrorText>{errors.cobcomDiscountPercent?.message}</Field.ErrorText>
                  </Field.Root>
                  {isEdit && (
                    <Box borderWidth="1px" borderRadius="md" p="3">
                      <Text fontWeight="semibold" mb="1">Estratégia de desconto por faixa</Text>
                      <Text fontSize="sm" color="fg.muted" mb="3">
                        Informe o desconto que esta carteira aplicará. Os limites negociados com o credor são exibidos como teto e não podem ser ultrapassados.
                      </Text>
                      {fields.length === 0 ? (
                        <Text fontSize="sm" color="fg.muted">Este credor não possui faixas de desconto cadastradas. Configure-as primeiro no cadastro do credor.</Text>
                      ) : <SimpleGrid columns={{ base: 1, lg: 2 }} gap="3">
                        {fields.map((field, index) => {
                          const ceiling = wallet?.creditor?.discountBands?.find((band) =>
                            band.minAgingDays === field.minAgingDays && band.maxAgingDays === field.maxAgingDays,
                          );
                          const range = field.maxAgingDays == null
                            ? `${field.minAgingDays}+ dias`
                            : `${field.minAgingDays} a ${field.maxAgingDays} dias`;
                          return (
                            <Box key={field.id} bg="bg.muted" borderRadius="sm" p="3">
                              <Text fontSize="sm" fontWeight="medium" mb="2">{range}</Text>
                              <SimpleGrid columns={{ base: 1, sm: 2 }} gap="3">
                                <Field.Root invalid={!!errors.discountBands?.[index]?.cashDiscountPercent}>
                                  <Field.Label>À vista (máx. {ceiling?.cashDiscountPercent ?? 0}%)</Field.Label>
                                  <Input type="number" min="0" max={ceiling?.cashDiscountPercent ?? 100} step="0.01" {...register(`discountBands.${index}.cashDiscountPercent`)} />
                                  <Field.ErrorText>{errors.discountBands?.[index]?.cashDiscountPercent?.message}</Field.ErrorText>
                                </Field.Root>
                                <Field.Root invalid={!!errors.discountBands?.[index]?.installmentDiscountPercent}>
                                  <Field.Label>Parcelado (máx. {ceiling?.installmentDiscountPercent ?? 0}%)</Field.Label>
                                  <Input type="number" min="0" max={ceiling?.installmentDiscountPercent ?? 100} step="0.01" {...register(`discountBands.${index}.installmentDiscountPercent`)} />
                                  <Field.ErrorText>{errors.discountBands?.[index]?.installmentDiscountPercent?.message}</Field.ErrorText>
                                </Field.Root>
                              </SimpleGrid>
                              <input type="hidden" {...register(`discountBands.${index}.minAgingDays`)} />
                              <input type="hidden" {...register(`discountBands.${index}.maxAgingDays`)} />
                            </Box>
                          );
                        })}
                      </SimpleGrid>}
                    </Box>
                  )}
                  <Field.Root invalid={!!errors.offerFirstInstallmentDays}>
                    <Field.Label>Prazo para o primeiro pagamento (dias)</Field.Label>
                    <Input type="number" min="1" max="365" {...register('offerFirstInstallmentDays')} />
                    <Field.HelperText>Padrão: 5 dias.</Field.HelperText>
                    <Field.ErrorText>{errors.offerFirstInstallmentDays?.message}</Field.ErrorText>
                  </Field.Root>
                  <Field.Root invalid={!!errors.offerMinInstallmentValue}>
                    <Field.Label>Valor mínimo por parcela (R$)</Field.Label>
                    <Input type="number" min="0.01" step="0.01" {...register('offerMinInstallmentValue')} />
                    <Field.ErrorText>{errors.offerMinInstallmentValue?.message}</Field.ErrorText>
                  </Field.Root>
                  <Field.Root invalid={!!errors.offerMaxInstallments}>
                    <Field.Label>Máximo de parcelas</Field.Label>
                    <Input type="number" min="1" max="999" {...register('offerMaxInstallments')} />
                    <Field.HelperText>Padrão: 1 parcela. O valor mínimo pode reduzir este limite para cada contrato.</Field.HelperText>
                    <Field.ErrorText>{errors.offerMaxInstallments?.message}</Field.ErrorText>
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
