import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  Field,
  Fieldset,
  Switch,
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { useUpdateUserMutation } from '../api/useUserMutations';
import { useAllWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { Role } from '@/types/enums';
import type { User } from '@/types/models';

const editSchema = z.object({
  role: z.nativeEnum(Role),
  isActive: z.boolean(),
  scopes: z.array(z.string()),
});

type EditFormData = z.infer<typeof editSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

const ROLE_OPTIONS = [
  { value: Role.ADMIN, label: 'Administrador' },
  { value: Role.OPERATIONAL, label: 'Operacional' },
  { value: Role.VIEWER, label: 'Visualizador' },
];

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const updateMutation = useUpdateUserMutation();
  const { data: walletsData } = useAllWalletsQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      role: user.role,
      isActive: user.isActive,
      scopes: user.scopes ?? [],
    },
  });

  const selectedScopes = watch('scopes');
  const isActive = watch('isActive');

  const onSubmit = (data: EditFormData) => {
    updateMutation.mutate(
      {
        userId: user.id,
        data: {
          role: data.role,
          isActive: data.isActive,
          scopes: data.scopes,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
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
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size={{ mdDown: 'full', md: 'md' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Editar Usuário: {user.email}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="4">
                  <Field.Root invalid={!!errors.role}>
                    <Field.Label>Role</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field {...register('role')}>
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </NativeSelect.Field>
                    <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.ErrorText>{errors.role?.message}</Field.ErrorText>
                  </Field.Root>

                  <Field.Root>
                    <Switch.Root
                      checked={isActive}
                      onCheckedChange={(e) => setValue('isActive', e.checked)}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <Switch.Label>Ativo</Switch.Label>
                    </Switch.Root>
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
                form="edit-user-form"
                loading={updateMutation.isPending}
              >
                Salvar
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
