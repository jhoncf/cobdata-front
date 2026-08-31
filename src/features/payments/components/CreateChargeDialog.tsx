import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  Input,
  Field,
  HStack,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { usePaymentGateways, usePreflightCharge, useCreateCharge } from '../hooks';
import { mapChargeError } from '../error-map';
import { generateIdempotencyKey } from '../utils/idempotency';
import { PreflightErrors } from './PreflightErrors';
import { PaymentChargeResult } from './PaymentChargeResult';
import { ChargeErrorFeedback } from './ChargeErrorFeedback';
import type {
  PaymentCharge,
  PaymentMethod,
  PaymentPreflightResult,
  UserFriendlyError,
} from '../types';
import type { Contract } from '@/types/models';
import type { AxiosError } from 'axios';

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreateChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateChargeDialog({
  open,
  onOpenChange,
  contract,
}: CreateChargeDialogProps) {
  const { data: gateways, isLoading: gatewaysLoading } = usePaymentGateways();
  const preflightMutation = usePreflightCharge(contract.id);
  const createChargeMutation = useCreateCharge(contract.id);

  // Form state
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Result / error state
  const [chargeResult, setChargeResult] = useState<PaymentCharge | null>(null);
  const [chargeError, setChargeError] = useState<UserFriendlyError | null>(null);
  const [preflightResult, setPreflightResult] = useState<PaymentPreflightResult | null>(null);

  // Filter active gateways only
  const activeGateways = useMemo(
    () => gateways?.filter((g) => g.enabled) ?? [],
    [gateways],
  );

  // Get available methods from selected gateway
  const selectedGateway = useMemo(
    () => activeGateways.find((g) => g.id === selectedGatewayId),
    [activeGateways, selectedGatewayId],
  );

  const availableMethods = selectedGateway?.supportedMethods ?? [];

  // Pre-fill defaults from contract
  useEffect(() => {
    if (open) {
      setAmount(
        contract.updatedValue.toString(),
      );
      setDueDate(contract.dueDate ?? '');
      setChargeResult(null);
      setChargeError(null);
      setPreflightResult(null);
      setSelectedGatewayId('');
      setSelectedMethod('');
    }
  }, [open, contract]);

  // Run preflight when gateway + method are selected
  useEffect(() => {
    if (selectedGatewayId && selectedMethod) {
      preflightMutation.mutate(
        { paymentGatewayId: selectedGatewayId, method: selectedMethod },
        {
          onSuccess: (result) => setPreflightResult(result),
          onError: () => setPreflightResult(null),
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGatewayId, selectedMethod]);

  // Determine if submission is possible
  const preflightValid = preflightResult?.valid ?? false;
  const isLoading = createChargeMutation.isPending;
  const canSubmit =
    selectedGatewayId &&
    selectedMethod &&
    amount &&
    dueDate &&
    preflightValid &&
    !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;

    setChargeError(null);

    // Generate a fresh idempotency key per attempt (Req 2 AC8)
    const idempotencyKey = generateIdempotencyKey();

    createChargeMutation.mutate(
      {
        paymentGatewayId: selectedGatewayId,
        method: selectedMethod as PaymentMethod,
        amount: parseFloat(amount),
        dueDate,
        idempotencyKey,
      },
      {
        onSuccess: (charge) => {
          setChargeResult(charge);
        },
        onError: (error) => {
          // Map to user-friendly error (Req 5)
          const friendlyError = mapChargeError(error as AxiosError);
          setChargeError(friendlyError);
        },
      },
    );
  };

  const handleEditContract = () => {
    // Close dialog and navigate to contract edit (simplification: close dialog)
    onOpenChange(false);
  };

  const handleGatewayChange = (gatewayId: string) => {
    setSelectedGatewayId(gatewayId);
    setSelectedMethod('');
    setPreflightResult(null);
  };

  // If charge was created, show result
  if (chargeResult) {
    return (
      <Dialog.Root
        open={open}
        onOpenChange={(e) => onOpenChange(e.open)}
        size={{ mdDown: 'full', md: 'lg' }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Cobrança emitida</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <PaymentChargeResult charge={chargeResult} />
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  colorPalette="blue"
                  onClick={() => onOpenChange(false)}
                >
                  Fechar
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

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size={{ mdDown: 'full', md: 'lg' }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Gerar cobrança</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                {/* Contract info */}
                <HStack gap="4" fontSize="sm" color="fg.muted">
                  <Text>Contrato: <strong>{contract.contractNumber}</strong></Text>
                  <Text>Devedor: <strong>{contract.debtorName ?? contract.debtorDocument}</strong></Text>
                </HStack>

                {/* Gateway selection */}
                <Field.Root>
                  <Field.Label>Meio de pagamento</Field.Label>
                  {gatewaysLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={selectedGatewayId}
                        onChange={(e) => handleGatewayChange(e.target.value)}
                      >
                        <option value="">Selecionar...</option>
                        {activeGateways.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  )}
                </Field.Root>

                {/* Method selection */}
                {selectedGatewayId && (
                  <Field.Root>
                    <Field.Label>Modalidade</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={selectedMethod}
                        onChange={(e) =>
                          setSelectedMethod(e.target.value as PaymentMethod)
                        }
                      >
                        <option value="">Selecionar...</option>
                        {availableMethods.map((m) => (
                          <option key={m} value={m}>
                            {m === 'BOLETO' ? 'Boleto' : m === 'PIX' ? 'Pix' : 'BolePix'}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                )}

                {/* Amount */}
                <Field.Root>
                  <Field.Label>Valor (R$)</Field.Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </Field.Root>

                {/* Due date */}
                <Field.Root>
                  <Field.Label>Vencimento</Field.Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field.Root>

                {/* Preflight errors */}
                {preflightMutation.isPending && (
                  <HStack gap="2">
                    <Spinner size="xs" />
                    <Text fontSize="sm" color="fg.muted">
                      Verificando pré-requisitos...
                    </Text>
                  </HStack>
                )}

                {preflightResult && !preflightResult.valid && (
                  <PreflightErrors
                    preflight={preflightResult}
                    onEditContract={handleEditContract}
                  />
                )}

                {/* Charge error feedback (Req 5) */}
                {chargeError && <ChargeErrorFeedback error={chargeError} />}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="blue"
                disabled={!canSubmit}
                loading={isLoading}
                onClick={handleSubmit}
              >
                Emitir cobrança
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
