import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { LuMonitor, LuTrash2 } from 'react-icons/lu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toaster } from '@/components/ui/toaster';
import api from '@/lib/api';

interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  isCurrent: boolean;
}

function useSessionsQuery() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => api.get<Session[]>('/auth/sessions').then((r) => r.data),
  });
}

function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toaster.create({ type: 'success', title: 'Sessão revogada' });
    },
    onError: () => {
      toaster.create({ type: 'error', title: 'Erro ao revogar sessão' });
    },
  });
}

function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/auth/sessions'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toaster.create({ type: 'success', title: 'Todas as outras sessões foram revogadas' });
    },
    onError: () => {
      toaster.create({ type: 'error', title: 'Erro ao revogar sessões' });
    },
  });
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Dispositivo desconhecido';
  // Simple UA parsing — extract browser and OS
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return ua.length > 50 ? ua.substring(0, 50) + '...' : ua;
}

export default function SessionsPage() {
  const { data: sessions, isLoading } = useSessionsQuery();
  const revokeSession = useRevokeSessionMutation();
  const revokeAllSessions = useRevokeAllSessionsMutation();

  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);

  const handleRevokeConfirm = () => {
    if (revokeTarget) {
      revokeSession.mutate(revokeTarget);
      setRevokeTarget(null);
    }
  };

  const handleRevokeAllConfirm = () => {
    revokeAllSessions.mutate();
    setShowRevokeAll(false);
  };

  if (isLoading) {
    return (
      <Box p="8" textAlign="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <Stack gap="6" p={{ base: 4, md: 6 }} maxW="3xl" mx="auto">
      <HStack justify="space-between" flexWrap="wrap" gap="2">
        <Heading size="lg">Sessões Ativas</Heading>
        {otherSessions.length > 0 && (
          <Button
            colorPalette="red"
            variant="outline"
            size="sm"
            onClick={() => setShowRevokeAll(true)}
          >
            <LuTrash2 />
            Revogar todas
          </Button>
        )}
      </HStack>

      {(!sessions || sessions.length === 0) && (
        <Text color="fg.muted">Nenhuma sessão encontrada.</Text>
      )}

      <Stack gap="3">
        {sessions?.map((session) => (
          <Card.Root key={session.id} variant="outline" size="sm">
            <Card.Body>
              <HStack justify="space-between" flexWrap="wrap" gap="3">
                <HStack gap="3" flex="1" minW="0">
                  <Box color="fg.muted">
                    <LuMonitor size={20} />
                  </Box>
                  <Stack gap="0" flex="1" minW="0">
                    <HStack gap="2" flexWrap="wrap">
                      <Text fontWeight="medium" textStyle="sm">
                        {parseUserAgent(session.userAgent)}
                      </Text>
                      {session.isCurrent && (
                        <Badge colorPalette="green" size="sm">
                          Sessão atual
                        </Badge>
                      )}
                    </HStack>
                    <HStack gap="3" textStyle="xs" color="fg.muted" flexWrap="wrap">
                      {session.ipAddress && <Text>IP: {session.ipAddress}</Text>}
                      <Text>Início: {formatDate(session.createdAt)}</Text>
                    </HStack>
                  </Stack>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  disabled={session.isCurrent}
                  title={session.isCurrent ? 'Não é possível revogar a sessão atual' : 'Revogar sessão'}
                  onClick={() => setRevokeTarget(session.id)}
                >
                  <LuTrash2 />
                  Revogar
                </Button>
              </HStack>
            </Card.Body>
          </Card.Root>
        ))}
      </Stack>

      {/* Confirm revoke single session */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}
        title="Revogar sessão"
        message="Tem certeza que deseja revogar esta sessão? O dispositivo será desconectado."
        confirmLabel="Revogar"
        colorPalette="red"
        onConfirm={handleRevokeConfirm}
        loading={revokeSession.isPending}
      />

      {/* Confirm revoke all sessions */}
      <ConfirmDialog
        open={showRevokeAll}
        onOpenChange={setShowRevokeAll}
        title="Revogar todas as sessões"
        message="Tem certeza que deseja revogar todas as outras sessões? Todos os dispositivos (exceto o atual) serão desconectados."
        confirmLabel="Revogar todas"
        colorPalette="red"
        onConfirm={handleRevokeAllConfirm}
        loading={revokeAllSessions.isPending}
      />
    </Stack>
  );
}
