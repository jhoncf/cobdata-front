import { useForm } from 'react-hook-form';
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
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { useCreateProviderMutation, useUpdateProviderMutation } from '../api/useProviderMutations';
import { ProviderType, ProviderEnv } from '@/types/enums';
import type { Provider } from '@/types/models';

const createSchema = z.object({
  type: z.nativeEnum(ProviderType, { errorMap: () => ({ message: 'Selecione um tipo' }) }),
  environment: z.nativeEnum(ProviderEnv, { errorMap: () => ({ message: 'Selecione um ambiente' }) }),
  credentials: z.object({
    username: z.string().min(1, 'Obrigatório'),
    password: z.string().min(1, 'Obrigatório'),
  }),
});

type ProviderFormData = z.infer<typeof createSchema>;

interface ProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider | null;
}

const TYPE_OPTIONS = [
  { value: ProviderType.SERASA_LNOP, label: 'Serasa LNOP' },
];

const ENV_OPTIONS = [
  { value: ProviderEnv.HOMOLOGATION, label: 'Homologação' },
  { value: ProviderEnv.PRODUCTION, label: 'Produção' },
];

export function ProviderFormDialog({ open, onOpenChange, provider }: ProviderFormDialogProps) {
  const isEditing = !!provider;
  const createMutation = useCreateProviderMutation();
  const updateMutation = useUpdateProviderMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProviderFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: provider
      ? {
          type: provider.type,
          environment: provider.environment,
          credentials: { username: '', password: '' },
        }
      : { type: undefined, environment: undefined, credentials: { username: '', password: '' } },
  });

  const onSubmit = (data: ProviderFormData) => {
    if (isEditing && provider) {
      updateMutation.mutate(
        {
          providerId: provider.id,
          data: {
            environment: data.environment,
            credentials: data.credentials,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          type: data.type,
          environment: data.environment,
          credentials: data.credentials,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        },
      );
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => { onOpenChange(e.open); if (!e.open) reset(); }}
      size={{ mdDown: 'full', md: 'md' }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{isEditing ? 'Editar Canal' : 'Novo Canal'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="provider-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="4">
                  <Field.Root invalid={!!errors.type}>
                    <Field.Label>Tipo</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        {...register('type')}
                        {...(isEditing ? { _disabled: { opacity: 0.5 }, readOnly: true } : {})}
                        placeholder="Selecionar tipo..."
                      >
                        {TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </NativeSelect.Field>
                    <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.ErrorText>{errors.type?.message}</Field.ErrorText>
                  </Field.Root>

                  <Field.Root invalid={!!errors.environment}>
                    <Field.Label>Ambiente</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        {...register('environment')}
                        placeholder="Selecionar ambiente..."
                      >
                        {ENV_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </NativeSelect.Field>
                    <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.ErrorText>{errors.environment?.message}</Field.ErrorText>
                  </Field.Root>

                  <Field.Root invalid={!!errors.credentials?.username}>
                    <Field.Label>Usuário (credencial)</Field.Label>
                    <Input
                      {...register('credentials.username')}
                      placeholder="Usuário do canal"
                    />
                    <Field.ErrorText>{errors.credentials?.username?.message}</Field.ErrorText>
                  </Field.Root>

                  <Field.Root invalid={!!errors.credentials?.password}>
                    <Field.Label>Senha (credencial)</Field.Label>
                    <Input
                      {...register('credentials.password')}
                      type="password"
                      placeholder={isEditing ? '(nova senha)' : 'Senha do canal'}
                    />
                    <Field.ErrorText>{errors.credentials?.password?.message}</Field.ErrorText>
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
                form="provider-form"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? 'Salvar' : 'Criar Canal'}
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
