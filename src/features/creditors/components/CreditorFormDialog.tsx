import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
  IconButton,
  HStack,
  Flex,
  Field,
  NativeSelect,
  Text,
  Tabs,
} from '@chakra-ui/react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { ContactType } from '@/types/enums';
import { CONTACT_TYPE_LABELS } from '@/lib/constants';
import type { Creditor } from '@/types/models';

const contactSchema = z.object({
  type: z.nativeEnum(ContactType),
  value: z.string().min(1, 'Obrigatório'),
});

const addressSchema = z.object({
  street: z.string().min(1, 'Obrigatório'),
  number: z.string().min(1, 'Obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Obrigatório'),
  city: z.string().min(1, 'Obrigatório'),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  zipCode: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
});

const creditorSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(255),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
    .optional()
    .or(z.literal('')),
  contacts: z.array(contactSchema).max(10, 'Máximo 10 contatos'),
  hasAddress: z.boolean(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
  webhookUrl: z.string().url('Informe uma URL válida').optional().or(z.literal('')),
  webhookAuthKey: z.string().max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.hasAddress && data.address) {
    const result = addressSchema.safeParse(data.address);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({ ...issue, path: ['address', ...issue.path] });
      });
    }
  }
});

type CreditorFormValues = z.infer<typeof creditorSchema>;

interface CreditorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditor?: Creditor | null;
  onSubmit: (data: {
    name: string;
    cnpj?: string;
    contacts?: { type: ContactType; value: string }[];
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
    webhookUrl?: string;
    webhookAuthKey?: string;
  }) => void;
  loading?: boolean;
}

export function CreditorFormDialog({
  open,
  onOpenChange,
  creditor,
  onSubmit,
  loading = false,
}: CreditorFormDialogProps) {
  const isEdit = !!creditor;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreditorFormValues>({
    resolver: zodResolver(creditorSchema),
    defaultValues: {
      name: '',
      cnpj: '',
      contacts: [],
      hasAddress: false,
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      },
      webhookUrl: '',
      webhookAuthKey: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  });
  const hasAddress = watch('hasAddress');

  useEffect(() => {
    if (open) {
      if (creditor) {
        reset({
          name: creditor.name,
          cnpj: creditor.cnpj ?? '',
          contacts: creditor.contacts ?? [],
          hasAddress: !!creditor.address,
          address: creditor.address ?? {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: '',
          },
          webhookUrl: creditor.webhookUrl ?? '',
          webhookAuthKey: '',
        });
      } else {
        reset({
          name: '',
          cnpj: '',
          contacts: [],
          hasAddress: false,
          address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: '',
          },
          webhookUrl: '',
          webhookAuthKey: '',
        });
      }
    }
  }, [open, creditor, reset]);

  const handleFormSubmit = (values: CreditorFormValues) => {
    onSubmit({
      name: values.name,
      cnpj: values.cnpj || undefined,
      contacts: values.contacts.length > 0 ? values.contacts : undefined,
      address: values.hasAddress ? values.address : undefined,
      webhookUrl: values.webhookUrl || undefined,
      webhookAuthKey: values.webhookAuthKey || undefined,
    });
  };

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
              <Dialog.Title>
                {isEdit ? 'Editar Credor' : 'Novo Credor'}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="creditor-form" onSubmit={handleSubmit(handleFormSubmit)}>
                <Tabs.Root defaultValue="general">
                  <Tabs.List mb="4">
                    <Tabs.Trigger value="general">Dados do credor</Tabs.Trigger>
                    <Tabs.Trigger value="webhook">Webhook</Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="general"><Stack gap="4">
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    <Field.Root invalid={!!errors.name} required>
                      <Field.Label>Razão Social</Field.Label>
                      <Input {...register('name')} />
                      <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
                    </Field.Root>
                    <Field.Root invalid={!!errors.cnpj}>
                      <Field.Label>CNPJ</Field.Label>
                      <Input
                        {...register('cnpj')}
                        placeholder="00000000000000"
                        maxLength={14}
                      />
                      <Field.ErrorText>{errors.cnpj?.message}</Field.ErrorText>
                    </Field.Root>
                  </SimpleGrid>

                  {/* Contacts */}
                  <Stack gap="2">
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="medium" fontSize="sm">Contatos</Text>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          append({ type: ContactType.EMAIL, value: '' })
                        }
                        disabled={fields.length >= 10}
                      >
                        <LuPlus /> Adicionar
                      </Button>
                    </Flex>
                    {fields.map((field, index) => (
                      <HStack key={field.id} gap="2">
                        <NativeSelect.Root size="sm" width="140px">
                          <NativeSelect.Field
                            {...register(`contacts.${index}.type`)}
                          >
                            {Object.values(ContactType).map((ct) => (
                              <option key={ct} value={ct}>
                                {CONTACT_TYPE_LABELS[ct]}
                              </option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        <Input
                          {...register(`contacts.${index}.value`)}
                          placeholder="Valor"
                          size="sm"
                          flex="1"
                        />
                        <IconButton
                          aria-label="Remover contato"
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => remove(index)}
                        >
                          <LuTrash2 />
                        </IconButton>
                      </HStack>
                    ))}
                  </Stack>

                  {/* Address toggle */}
                  <HStack gap="2">
                    <input
                      type="checkbox"
                      id="has-address-check"
                      {...register('hasAddress')}
                    />
                    <label htmlFor="has-address-check">Incluir endereço</label>
                  </HStack>

                  {hasAddress && (
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                      <Field.Root invalid={!!errors.address?.street} required>
                        <Field.Label>Rua</Field.Label>
                        <Input {...register('address.street')} />
                        <Field.ErrorText>
                          {errors.address?.street?.message}
                        </Field.ErrorText>
                      </Field.Root>
                      <Field.Root invalid={!!errors.address?.number} required>
                        <Field.Label>Número</Field.Label>
                        <Input {...register('address.number')} />
                        <Field.ErrorText>
                          {errors.address?.number?.message}
                        </Field.ErrorText>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Complemento</Field.Label>
                        <Input {...register('address.complement')} />
                      </Field.Root>
                      <Field.Root
                        invalid={!!errors.address?.neighborhood}
                        required
                      >
                        <Field.Label>Bairro</Field.Label>
                        <Input {...register('address.neighborhood')} />
                        <Field.ErrorText>
                          {errors.address?.neighborhood?.message}
                        </Field.ErrorText>
                      </Field.Root>
                      <Field.Root invalid={!!errors.address?.city} required>
                        <Field.Label>Cidade</Field.Label>
                        <Input {...register('address.city')} />
                        <Field.ErrorText>
                          {errors.address?.city?.message}
                        </Field.ErrorText>
                      </Field.Root>
                      <Field.Root invalid={!!errors.address?.state} required>
                        <Field.Label>UF</Field.Label>
                        <Input
                          {...register('address.state')}
                          maxLength={2}
                          placeholder="SP"
                        />
                        <Field.ErrorText>
                          {errors.address?.state?.message}
                        </Field.ErrorText>
                      </Field.Root>
                      <Field.Root invalid={!!errors.address?.zipCode} required>
                        <Field.Label>CEP</Field.Label>
                        <Input
                          {...register('address.zipCode')}
                          maxLength={8}
                          placeholder="00000000"
                        />
                        <Field.ErrorText>
                          {errors.address?.zipCode?.message}
                        </Field.ErrorText>
                      </Field.Root>
                    </SimpleGrid>
                  )}
                  </Stack></Tabs.Content>
                  <Tabs.Content value="webhook">
                    <Stack gap="4">
                      <Text fontSize="sm" color="fg.muted">Receba atualizações de status dos contratos deste credor.</Text>
                      <Field.Root invalid={!!errors.webhookUrl} required>
                        <Field.Label>URL do webhook</Field.Label>
                        <Input {...register('webhookUrl')} placeholder="https://suaempresa.com/webhooks/cobcom" />
                        <Field.ErrorText>{errors.webhookUrl?.message}</Field.ErrorText>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Chave de autenticação (opcional)</Field.Label>
                        <Input type="password" {...register('webhookAuthKey')} placeholder={creditor?.hasWebhookAuthKey ? 'Chave já configurada — deixe em branco para manter' : 'Chave compartilhada'} />
                        <Text fontSize="xs" color="fg.muted">Enviada como <code>Authorization: Bearer sua-chave</code>. A chave é armazenada criptografada.</Text>
                      </Field.Root>
                      <Text fontWeight="medium">Exemplo de envio</Text>
                      <Input as="textarea" rows={12} readOnly fontFamily="mono" fontSize="xs" value={'curl -X POST ' + (watch('webhookUrl') || 'https://suaempresa.com/webhooks/cobcom') + " \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-CobCom-Event: contract.status.updated' \\\n  -d '{\"event\":\"contract.status.updated\",\"data\":{\"contract\":{\"number\":\"12345\"},\"status\":{\"paymentStatus\":\"PAID\"}}}'"} />
                    </Stack>
                  </Tabs.Content>
                </Tabs.Root>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="blue"
                type="submit"
                form="creditor-form"
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
