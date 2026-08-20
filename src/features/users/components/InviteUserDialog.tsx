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
  Fieldset,
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { useInviteUserMutation } from '../api/useUserMutations';
import { useAllWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { Role } from '@/types/enums';

const inviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'Selecione um role' }) }),
  scopes: z.array(z.string()).optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS = [
  { value: Role.ADMIN, label: 'Administrador' },
  { value: Role.OPERATIONAL, label: 'Operacional' },
  { value: Role.VIEWER, label: 'Visualizador' },
];

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const inviteMutation = useInviteUserMutation();
  const { data: walletsData } = useAllWalletsQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: undefined, scopes: [] },
  });

  const selectedScopes = watch('scopes') ?? [];

  const onSubmit = (data: InviteFormData) => {
    inviteMutation.mutate(
      {
        email: data.email,
        role: data.role,
        scopes: data.scopes?.length ? data.scopes : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      },
    );
  };

  const handleScopeToggle = (walletId: string) => {
    const current = selectedScopes;
    if (current.includes(walletId)) {
      setValue('scopes', current.filter((s) => s !== walletId));
    } else {
      setValue('scopes', [...current, walletId]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { onOpenChange(e.open); if (!e.open) reset(); }} size={{ mdDown: 'full', md: 'md' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Convidar Usuário</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="invite-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="4">
                  <Field.Root invalid={!!errors.email}>
                    <Field.Label>E-mail</Field.Label>
                    <Input {...register('email')} type="email" placeholder="usuario@empresa.com" />
                    <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
                  </Field.Root>

                  <Field.Root invalid={!!errors.role}>
                    <Field.Label>Role</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        {...register('role')}
                        placeholder="Selecionar role..."
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </NativeSelect.Field>
                    <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.ErrorText>{errors.role?.message}</Field.ErrorText>
                  </Field.Root>

                  <Fieldset.Root>
                    <Fieldset.Legend fontSize="sm">Escopos (carteiras)</Fieldset.Legend>
                    <Stack gap="1" maxH="200px" overflowY="auto" borderWidth="1px" rounded="md" p="2">
                      {walletsData?.data.map((w) => (
                        <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(w.id)}
                            onChange={() => handleScopeToggle(w.id)}
                          />
                          {w.name}
                        </label>
                      ))}
                    </Stack>
                  </Fieldset.Root>
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
                form="invite-form"
                loading={inviteMutation.isPending}
              >
                Enviar Convite
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
