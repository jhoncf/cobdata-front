import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  Input,
  Field,
  HStack,
  Badge,
  Text,
  Switch,
  Checkbox,
  Box,
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { PasswordInput } from '@/components/ui/password-input';
import { useCreatePaymentGateway, useUpdatePaymentGateway } from '../hooks';
import type { PaymentGatewaySummary, PaymentMethod } from '../types';

// ─── Schema ──────────────────────────────────────────────────────────────────

const paymentGatewaySchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  providerType: z.string().min(1, 'Selecione um provedor'),
  environment: z.string().min(1, 'Selecione um ambiente'),
  enabled: z.boolean(),
  supportedMethods: z
    .array(z.enum(['BOLETO', 'PIX', 'BOLEPIX']))
    .min(1, 'Selecione pelo menos uma modalidade'),
  credentials: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    developerKey: z.string().optional(),
    certificateBase64: z.string().optional(),
    certificatePassword: z.string().optional(),
    pixKey: z.string().optional(),
  }),
});

type PaymentGatewayFormData = z.infer<typeof paymentGatewaySchema>;

// ─── Options ─────────────────────────────────────────────────────────────────

const PROVIDER_OPTIONS = [
  { value: 'BANCO_DO_BRASIL', label: 'Banco do Brasil' },
];

const ENV_OPTIONS = [
  { value: 'HOMOLOGATION', label: 'Homologação' },
  { value: 'PRODUCTION', label: 'Produção' },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLEPIX', label: 'BolePix' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface PaymentGatewayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gateway: PaymentGatewaySummary | null;
}

export function PaymentGatewayFormDialog({
  open,
  onOpenChange,
  gateway,
}: PaymentGatewayFormDialogProps) {
  const isEditing = !!gateway;
  const createMutation = useCreatePaymentGateway();
  const updateMutation = useUpdatePaymentGateway();
  const [showCredentials, setShowCredentials] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentGatewayFormData>({
    resolver: zodResolver(paymentGatewaySchema),
    defaultValues: {
      name: '',
      providerType: '',
      environment: '',
      enabled: true,
      supportedMethods: [],
      credentials: {},
    },
  });

  useEffect(() => {
    if (gateway) {
      reset({
        name: gateway.name,
        providerType: gateway.providerType,
        environment: gateway.environment,
        enabled: gateway.enabled,
        supportedMethods: gateway.supportedMethods,
        credentials: {},
      });
      setShowCredentials(false);
    } else {
      reset({
        name: '',
        providerType: '',
        environment: '',
        enabled: true,
        supportedMethods: [],
        credentials: {},
      });
      setShowCredentials(true);
    }
  }, [gateway, reset]);

  const supportedMethods = watch('supportedMethods');

  const handleMethodToggle = (method: PaymentMethod, checked: boolean) => {
    const current = supportedMethods ?? [];
    if (checked) {
      setValue('supportedMethods', [...current, method], { shouldValidate: true });
    } else {
      setValue(
        'supportedMethods',
        current.filter((m) => m !== method),
        { shouldValidate: true },
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] ?? '';
      setValue('credentials.certificateBase64', base64);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: PaymentGatewayFormData) => {
    // Strip empty credential fields
    const credentials: Record<string, string> = {};
    if (data.credentials.clientId) credentials.clientId = data.credentials.clientId;
    if (data.credentials.clientSecret) credentials.clientSecret = data.credentials.clientSecret;
    if (data.credentials.developerKey) credentials.developerKey = data.credentials.developerKey;
    if (data.credentials.certificateBase64)
      credentials.certificateBase64 = data.credentials.certificateBase64;
    if (data.credentials.certificatePassword)
      credentials.certificatePassword = data.credentials.certificatePassword;
    if (data.credentials.pixKey) credentials.pixKey = data.credentials.pixKey;

    const payload = {
      name: data.name,
      providerType: data.providerType,
      environment: data.environment,
      enabled: data.enabled,
      supportedMethods: data.supportedMethods,
      credentials,
    };

    if (isEditing && gateway) {
      updateMutation.mutate(
        { id: gateway.id, input: payload },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      });
    }
  };

  const shouldShowCredentials = !isEditing || showCredentials;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        onOpenChange(e.open);
        if (!e.open) reset();
      }}
      size={{ mdDown: 'full', md: 'lg' }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {isEditing ? 'Editar Meio de Pagamento' : 'Nova Configuração'}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="payment-gateway-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="4">
                  {/* Name */}
                  <Field.Root invalid={!!errors.name}>
                    <Field.Label>Nome</Field.Label>
                    <Input
                      {...register('name')}
                      placeholder="Ex: Banco do Brasil - Produção"
                    />
                    <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
                  </Field.Root>

                  {/* Provider Type */}
                  <Field.Root invalid={!!errors.providerType}>
                    <Field.Label>Provedor</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        {...register('providerType')}
                        placeholder="Selecionar provedor..."
                      >
                        {PROVIDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.ErrorText>{errors.providerType?.message}</Field.ErrorText>
                  </Field.Root>

                  {/* Environment */}
                  <Field.Root invalid={!!errors.environment}>
                    <Field.Label>Ambiente</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        {...register('environment')}
                        placeholder="Selecionar ambiente..."
                      >
                        {ENV_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.ErrorText>{errors.environment?.message}</Field.ErrorText>
                  </Field.Root>

                  {/* Enabled */}
                  <Controller
                    name="enabled"
                    control={control}
                    render={({ field }) => (
                      <Field.Root>
                        <HStack justify="space-between">
                          <Field.Label mb="0">Ativo</Field.Label>
                          <Switch.Root
                            checked={field.value}
                            onCheckedChange={(e) => field.onChange(e.checked)}
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Root>
                        </HStack>
                      </Field.Root>
                    )}
                  />

                  {/* Supported Methods */}
                  <Field.Root invalid={!!errors.supportedMethods}>
                    <Field.Label>Modalidades</Field.Label>
                    <Stack gap="2">
                      {METHOD_OPTIONS.map((method) => (
                        <Checkbox.Root
                          key={method.value}
                          checked={supportedMethods?.includes(method.value)}
                          onCheckedChange={(e) =>
                            handleMethodToggle(method.value, !!e.checked)
                          }
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Label>{method.label}</Checkbox.Label>
                        </Checkbox.Root>
                      ))}
                    </Stack>
                    <Field.ErrorText>{errors.supportedMethods?.message}</Field.ErrorText>
                  </Field.Root>

                  {/* Credentials Section */}
                  <Box borderTopWidth="1px" borderColor="border" pt="4" mt="2">
                    <HStack justify="space-between" mb="3">
                      <Text fontWeight="semibold" fontSize="sm">
                        Credenciais
                      </Text>
                      {isEditing && !showCredentials && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setShowCredentials(true)}
                        >
                          Atualizar credenciais
                        </Button>
                      )}
                    </HStack>

                    {/* Credential configured indicators (edit mode) */}
                    {isEditing && !showCredentials && (
                      <Stack gap="2">
                        {gateway?.hasCredentials && (
                          <Badge colorPalette="green" variant="subtle" size="sm">
                            ✓ Credencial configurada
                          </Badge>
                        )}
                        {gateway?.hasCertificate && (
                          <Badge colorPalette="green" variant="subtle" size="sm">
                            ✓ Certificado configurado
                          </Badge>
                        )}
                        {gateway?.hasPixKey && (
                          <Badge colorPalette="green" variant="subtle" size="sm">
                            ✓ Chave Pix configurada
                          </Badge>
                        )}
                      </Stack>
                    )}

                    {/* Credential fields */}
                    {shouldShowCredentials && (
                      <Stack gap="3">
                        <Field.Root>
                          <Field.Label>Client ID</Field.Label>
                          <PasswordInput
                            {...register('credentials.clientId')}
                            placeholder={isEditing ? '(novo Client ID)' : 'Client ID'}
                          />
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>Client Secret</Field.Label>
                          <PasswordInput
                            {...register('credentials.clientSecret')}
                            placeholder={
                              isEditing ? '(novo Client Secret)' : 'Client Secret'
                            }
                          />
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>Developer Key</Field.Label>
                          <PasswordInput
                            {...register('credentials.developerKey')}
                            placeholder={
                              isEditing ? '(nova Developer Key)' : 'Developer Key'
                            }
                          />
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>Certificado (.p12 / .pfx)</Field.Label>
                          <Input
                            type="file"
                            accept=".p12,.pfx"
                            onChange={handleFileUpload}
                            pt="1"
                          />
                          <Field.HelperText>
                            O arquivo será convertido em base64 para envio.
                          </Field.HelperText>
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>Senha do Certificado</Field.Label>
                          <PasswordInput
                            {...register('credentials.certificatePassword')}
                            placeholder="Senha do certificado"
                          />
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>Chave Pix</Field.Label>
                          <Input
                            {...register('credentials.pixKey')}
                            placeholder="Chave Pix (e-mail, telefone, CNPJ ou aleatória)"
                          />
                        </Field.Root>
                      </Stack>
                    )}
                  </Box>
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
                form="payment-gateway-form"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? 'Salvar' : 'Criar'}
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
