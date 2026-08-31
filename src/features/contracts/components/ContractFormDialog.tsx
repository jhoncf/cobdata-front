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
  SimpleGrid,
  Stack,
  Field,
  NativeSelect,
  Heading,
} from '@chakra-ui/react';
import { DebtType, ContractStatus, OfferType } from '@/types/enums';
import { DEBT_TYPE_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/constants';
import { useWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import type { Contract } from '@/types/models';
import type { CreateContractDto, UpdateContractDto } from '@/types/api';

const contractFormSchema = z.object({
  walletId: z.string().min(1, 'Selecione uma carteira'),
  debtorDocument: z.string().min(1, 'CPF ou CNPJ é obrigatório'),
  debtorName: z.string().max(200, 'Nome deve ter no máximo 200 caracteres'),
  contractNumber: z.string().min(1, 'Número do contrato é obrigatório'),
  debtType: z.nativeEnum(DebtType),
  occurrenceDate: z.string().min(1, 'Data de contratação obrigatória'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  originalValue: z.coerce.number().positive('Valor deve ser positivo'),
  updatedValue: z.coerce.number().positive('Valor atualizado é obrigatório e deve ser positivo'),
  debtOrigin: z.string().optional(),
  productName: z.string().optional(),
  debtorStreet: z.string().optional(),
  debtorCity: z.string().optional(),
  debtorPhone: z.string().optional(),
  debtorEmail: z.string().email('E-mail inválido').or(z.literal('')),
  isNegativated: z.boolean(),
  cancelledAt: z.string().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
  hasOffer: z.boolean(),
  offerType: z.nativeEnum(OfferType).optional(),
  offerDiscountPercentage: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  offerInstallments: z.coerce.number().int().min(1).optional().or(z.literal('')),
  offerInstallmentValue: z.coerce.number().min(0).optional().or(z.literal('')),
  offerTotalValue: z.coerce.number().min(0).optional().or(z.literal('')),
  offerExpiresAt: z.string().optional(),
  offerNotes: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
  onSubmit: (data: CreateContractDto | UpdateContractDto) => void;
  loading?: boolean;
  /** Preselects the wallet when opened from a wallet detail screen. */
  defaultWalletId?: string;
}

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  onSubmit,
  loading = false,
  defaultWalletId,
}: ContractFormDialogProps) {
  const isEdit = !!contract;
  const { data: walletsData } = useWalletsQuery({ page: 1, limit: 100 });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      walletId: '',
      debtorDocument: '',
      debtorName: '',
      contractNumber: '',
      debtType: DebtType.COMMERCIAL,
      occurrenceDate: '',
      dueDate: '',
      originalValue: 0,
      updatedValue: 0,
      debtOrigin: '',
      productName: '',
      debtorStreet: '',
      debtorCity: '',
      debtorPhone: '',
      debtorEmail: '',
      isNegativated: false,
      cancelledAt: '',
      status: ContractStatus.ACTIVE,
      hasOffer: false,
      offerType: OfferType.DISCOUNT,
      offerDiscountPercentage: '',
      offerInstallments: '',
      offerInstallmentValue: '',
      offerTotalValue: '',
      offerExpiresAt: '',
      offerNotes: '',
    },
  });

  const hasOffer = watch('hasOffer');

  useEffect(() => {
    if (open) {
      if (contract) {
        reset({
          walletId: contract.walletId,
          debtorDocument: contract.debtorDocument,
          debtorName: contract.debtorName ?? '',
          contractNumber: contract.contractNumber,
          debtType: contract.debtType,
          occurrenceDate: contract.occurrenceDate.split('T')[0] ?? contract.occurrenceDate,
          dueDate: contract.dueDate?.split('T')[0] ?? '',
          originalValue: contract.originalValue,
          updatedValue: contract.updatedValue,
          debtOrigin: contract.debtOrigin ?? '',
          productName: contract.productName ?? '',
          debtorStreet: contract.debtorStreet ?? '',
          debtorCity: contract.debtorCity ?? '',
          debtorPhone: contract.debtorPhone ?? '',
          debtorEmail: contract.debtorEmail ?? '',
          isNegativated: contract.isNegativated ?? false,
          cancelledAt: contract.cancelledAt?.split('T')[0] ?? '',
          status: contract.status,
          hasOffer: !!contract.offer,
          offerType: contract.offer?.type ?? OfferType.DISCOUNT,
          offerDiscountPercentage: contract.offer?.discountPercentage ?? '',
          offerInstallments: contract.offer?.installments ?? '',
          offerInstallmentValue: contract.offer?.installmentValue ?? '',
          offerTotalValue: contract.offer?.totalValue ?? '',
          offerExpiresAt: contract.offer?.expiresAt?.split('T')[0] ?? '',
          offerNotes: contract.offer?.notes ?? '',
        });
      } else {
        reset({
          walletId: defaultWalletId ?? '',
          debtorDocument: '',
          debtorName: '',
          contractNumber: '',
          debtType: DebtType.COMMERCIAL,
          occurrenceDate: '',
          dueDate: '',
          originalValue: 0,
          updatedValue: 0,
          debtOrigin: '',
          productName: '',
          debtorStreet: '',
          debtorCity: '',
          debtorPhone: '',
          debtorEmail: '',
          isNegativated: false,
          cancelledAt: '',
          status: ContractStatus.ACTIVE,
          hasOffer: false,
          offerType: OfferType.DISCOUNT,
          offerDiscountPercentage: '',
          offerInstallments: '',
          offerInstallmentValue: '',
          offerTotalValue: '',
          offerExpiresAt: '',
          offerNotes: '',
        });
      }
    }
  }, [open, contract, defaultWalletId, reset]);

  const handleFormSubmit = (values: ContractFormValues) => {
    const offer = values.hasOffer
      ? {
          type: values.offerType ?? OfferType.DISCOUNT,
          discountPercentage: values.offerDiscountPercentage ? Number(values.offerDiscountPercentage) : undefined,
          installments: values.offerInstallments ? Number(values.offerInstallments) : undefined,
          installmentValue: values.offerInstallmentValue ? Number(values.offerInstallmentValue) : undefined,
          totalValue: values.offerTotalValue ? Number(values.offerTotalValue) : undefined,
          expiresAt: values.offerExpiresAt || undefined,
          notes: values.offerNotes || undefined,
        }
      : undefined;

    if (isEdit) {
      const dto: UpdateContractDto = {
        walletId: values.walletId,
        debtorName: values.debtorName,
        debtType: values.debtType,
        occurrenceDate: values.occurrenceDate,
        dueDate: values.dueDate,
        originalValue: values.originalValue,
        updatedValue: Number(values.updatedValue),
        debtOrigin: values.debtOrigin || undefined,
        productName: values.productName || undefined,
        debtorStreet: values.debtorStreet || undefined,
        debtorCity: values.debtorCity || undefined,
        debtorPhone: values.debtorPhone || undefined,
        debtorEmail: values.debtorEmail || undefined,
        isNegativated: values.isNegativated,
        cancelledAt: values.cancelledAt || undefined,
        status: values.status,
        offer,
      };
      onSubmit(dto);
    } else {
      const doc = (values.debtorDocument ?? '').replace(/\D/g, '');
      const dto: CreateContractDto = {
        walletId: values.walletId,
        debtorDocument: doc,
        debtorName: values.debtorName,
        contractNumber: values.contractNumber ?? '',
        debtType: values.debtType,
        occurrenceDate: values.occurrenceDate,
        dueDate: values.dueDate,
        originalValue: values.originalValue,
        updatedValue: Number(values.updatedValue),
        debtOrigin: values.debtOrigin || undefined,
        productName: values.productName || undefined,
        debtorStreet: values.debtorStreet || undefined,
        debtorCity: values.debtorCity || undefined,
        debtorPhone: values.debtorPhone || undefined,
        debtorEmail: values.debtorEmail || undefined,
        isNegativated: values.isNegativated,
        cancelledAt: values.cancelledAt || undefined,
        offer,
      };
      onSubmit(dto);
    }
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
                {isEdit ? 'Editar Contrato' : 'Novo Contrato'}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="contract-form" onSubmit={handleSubmit(handleFormSubmit)}>
                <Stack gap="4">
                  {/* Seção: Dados Principais */}
                  <Heading size="sm">Dados Principais</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    <Field.Root invalid={!!errors.walletId} required>
                      <Field.Label>Carteira</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field {...register('walletId')}>
                          <option value="">Selecione</option>
                          {walletsData?.data.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </NativeSelect.Field>
                      <NativeSelect.Indicator />
                      </NativeSelect.Root>
                      <Field.ErrorText>{errors.walletId?.message}</Field.ErrorText>
                    </Field.Root>

                    {!isEdit && (
                      <>
                        <Field.Root invalid={!!errors.debtorDocument} required>
                          <Field.Label>CPF/CNPJ do Devedor</Field.Label>
                          <Input {...register('debtorDocument')} placeholder="Somente números" />
                          <Field.ErrorText>{errors.debtorDocument?.message}</Field.ErrorText>
                        </Field.Root>
                        <Field.Root invalid={!!errors.contractNumber} required>
                          <Field.Label>Número do Contrato (NUM_ADM)</Field.Label>
                          <Input {...register('contractNumber')} />
                          <Field.ErrorText>{errors.contractNumber?.message}</Field.ErrorText>
                        </Field.Root>
                      </>
                    )}

                    <Field.Root invalid={!!errors.debtorName}>
                      <Field.Label>Nome do Devedor</Field.Label>
                      <Input {...register('debtorName')} placeholder="Nome completo" />
                      <Field.ErrorText>{errors.debtorName?.message}</Field.ErrorText>
                    </Field.Root>

                    <Field.Root invalid={!!errors.debtType} required>
                      <Field.Label>Tipo de Dívida</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field {...register('debtType')}>
                          {Object.values(DebtType).map((dt) => (
                            <option key={dt} value={dt}>{DEBT_TYPE_LABELS[dt]}</option>
                          ))}
                        </NativeSelect.Field>
                      <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    <Field.Root invalid={!!errors.occurrenceDate} required>
                      <Field.Label>Data de Contratação</Field.Label>
                      <Input type="date" {...register('occurrenceDate')} />
                      <Field.ErrorText>{errors.occurrenceDate?.message}</Field.ErrorText>
                    </Field.Root>

                    <Field.Root invalid={!!errors.dueDate} required>
                      <Field.Label>Data de Vencimento</Field.Label>
                      <Input type="date" {...register('dueDate')} />
                      <Field.ErrorText>{errors.dueDate?.message}</Field.ErrorText>
                    </Field.Root>

                    <Field.Root invalid={!!errors.originalValue} required>
                      <Field.Label>Valor em Aberto (R$)</Field.Label>
                      <Input type="number" step="0.01" {...register('originalValue')} />
                      <Field.ErrorText>{errors.originalValue?.message}</Field.ErrorText>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Valor Atualizado (R$)</Field.Label>
                      <Input type="number" step="0.01" {...register('updatedValue')} />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Origem da Dívida</Field.Label>
                      <Input {...register('debtOrigin')} />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Produto</Field.Label>
                      <Input {...register('productName')} placeholder="Nome do produto" />
                    </Field.Root>
                  </SimpleGrid>

                  {/* Seção: Dados do Devedor */}
                  <Heading size="sm" mt="2">Dados do Devedor</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    <Field.Root>
                      <Field.Label>Endereço (Rua)</Field.Label>
                      <Input {...register('debtorStreet')} />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Cidade</Field.Label>
                      <Input {...register('debtorCity')} />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Telefone</Field.Label>
                      <Input {...register('debtorPhone')} placeholder="11999998888" />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>E-mail</Field.Label>
                      <Input type="email" {...register('debtorEmail')} />
                    </Field.Root>
                  </SimpleGrid>

                  {/* Seção: Status e Cancelamento */}
                  <Heading size="sm" mt="2">Status</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    <Field.Root>
                      <Field.Label>Status Negativação</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field {...register('isNegativated', { setValueAs: (v) => v === 'true' })}>
                          <option value="false">Não Negativado</option>
                          <option value="true">Negativado</option>
                        </NativeSelect.Field>
                      <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Mês Cancelamento</Field.Label>
                      <Input type="date" {...register('cancelledAt')} />
                    </Field.Root>

                    {isEdit && (
                      <Field.Root required>
                        <Field.Label>Status do Contrato</Field.Label>
                        <NativeSelect.Root>
                          <NativeSelect.Field {...register('status')}>
                            {Object.values(ContractStatus).map((s) => (
                              <option key={s} value={s}>{CONTRACT_STATUS_LABELS[s]}</option>
                            ))}
                          </NativeSelect.Field>
                        <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Field.Root>
                    )}
                  </SimpleGrid>

                  {/* Seção: Oferta */}
                  <Stack gap="3" mt="2">
                    <label>
                      <input type="checkbox" {...register('hasOffer')} /> Incluir oferta
                    </label>

                    {hasOffer && (
                      <>
                        <Heading size="sm" mt="2">Dados da Oferta</Heading>
                        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                          <Field.Root required>
                            <Field.Label>Tipo de Oferta</Field.Label>
                            <NativeSelect.Root>
                              <NativeSelect.Field {...register('offerType')}>
                                <option value={OfferType.DISCOUNT}>Desconto</option>
                                <option value={OfferType.INSTALLMENT}>Parcelamento</option>
                                <option value={OfferType.FULL_PAYMENT}>Pagamento Integral</option>
                              </NativeSelect.Field>
                            <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>Desconto (%)</Field.Label>
                            <Input type="number" step="0.01" {...register('offerDiscountPercentage')} />
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>Parcelas</Field.Label>
                            <Input type="number" {...register('offerInstallments')} />
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>Valor da Parcela (R$)</Field.Label>
                            <Input type="number" step="0.01" {...register('offerInstallmentValue')} />
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>Valor Total (R$)</Field.Label>
                            <Input type="number" step="0.01" {...register('offerTotalValue')} />
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>Expira em</Field.Label>
                            <Input type="date" {...register('offerExpiresAt')} />
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>Observações</Field.Label>
                            <Input {...register('offerNotes')} />
                          </Field.Root>
                        </SimpleGrid>
                      </>
                    )}
                  </Stack>
                </Stack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="blue" type="submit" form="contract-form" loading={loading}>
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
