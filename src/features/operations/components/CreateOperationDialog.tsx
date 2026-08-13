import { useState } from 'react';
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  Text,
  Box,
  Badge,
} from '@chakra-ui/react';
import { NativeSelect } from '@chakra-ui/react';
import { useAllWalletsQuery } from '@/features/wallets/api/useWalletsQuery';
import { useOperationPreviewQuery } from '../api/useOperationsQuery';
import { useCreateOperationMutation } from '../api/useOperationMutations';
import { OperationAction } from '@/types/enums';

interface CreateOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_OPTIONS = [
  { value: OperationAction.CREATE_OR_UPDATE, label: 'Incluir/Atualizar no Provedor' },
  { value: OperationAction.REMOVE, label: 'Remover do Provedor' },
];

export function CreateOperationDialog({ open, onOpenChange }: CreateOperationDialogProps) {
  const [walletId, setWalletId] = useState('');
  const [action, setAction] = useState<OperationAction | ''>('');

  const { data: walletsData } = useAllWalletsQuery();
  const createMutation = useCreateOperationMutation();

  const { data: preview, isLoading: previewLoading } = useOperationPreviewQuery(
    walletId || undefined,
    (action as OperationAction) || undefined,
  );

  const eligibleCount = preview?.eligibleCount ?? 0;
  const canSubmit = !!walletId && !!action && eligibleCount > 0;

  const handleSubmit = () => {
    if (!walletId || !action) return;
    createMutation.mutate(
      { walletId, action: action as OperationAction },
      {
        onSuccess: () => {
          onOpenChange(false);
          setWalletId('');
          setAction('');
        },
      },
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size={{ mdDown: 'full', md: 'md' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Nova Operação</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb="1">Carteira</Text>
                  <NativeSelect.Root size="md">
                    <NativeSelect.Field
                      placeholder="Selecionar carteira..."
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                    >
                      {walletsData?.data.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </NativeSelect.Field>
                  <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb="1">Ação</Text>
                  <NativeSelect.Root size="md">
                    <NativeSelect.Field
                      placeholder="Selecionar ação..."
                      value={action}
                      onChange={(e) => setAction(e.target.value as OperationAction)}
                    >
                      {ACTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </NativeSelect.Field>
                  <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>

                {walletId && action && (
                  <Box borderWidth="1px" rounded="md" p="3" bg="bg.subtle">
                    {previewLoading ? (
                      <Text fontSize="sm" color="fg.muted">Calculando contratos elegíveis...</Text>
                    ) : eligibleCount > 0 ? (
                      <Text fontSize="sm">
                        <Badge colorPalette="blue" mr="2">{eligibleCount}</Badge>
                        contratos elegíveis para esta operação
                      </Text>
                    ) : (
                      <Text fontSize="sm" color="orange.fg">
                        Nenhum contrato elegível para esta ação nesta carteira.
                      </Text>
                    )}
                  </Box>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="blue"
                onClick={handleSubmit}
                loading={createMutation.isPending}
                disabled={!canSubmit}
              >
                Criar Operação
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
