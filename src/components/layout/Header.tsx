import { useState } from 'react';
import { Box, Flex, HStack, IconButton, Text, Badge, Portal, Menu, Separator, Image } from '@chakra-ui/react';
import { LuMenu, LuMoon, LuSun, LuLogOut, LuUser, LuKey, LuPanelLeftClose, LuPanelLeftOpen } from 'react-icons/lu';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { GlobalSearchBar } from '@/features/search/components';
import { useCreditorQuery } from '@/features/creditors/api/useCreditorsQuery';

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

export function Header({ onMenuClick, sidebarCollapsed = false, onSidebarToggle }: HeaderProps) {
  const { userName, role, creditorId, user } = useAuth();
  const { data: creditor } = useCreditorQuery(creditorId ?? '');
  // The portal identity comes with /auth/me. The creditor lookup remains a
  // fallback only, so a transient detail-query failure never hides the name.
  const creditorName = user?.creditorName?.trim()
    || creditor?.tradeName?.trim()
    || creditor?.name?.trim();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleColorMode = () => {
    const next = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Silently fail
    } finally {
      logout();
      navigate('/login');
    }
  };

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <Flex
      as="header"
      minH="14"
      h="auto"
      px="4"
      py={{ base: '2', lg: '0' }}
      align="center"
      wrap="wrap"
      gap={{ base: '2', lg: '0' }}
      borderBottomWidth="1px"
      borderColor="sidebar.border"
      bg="sidebar.bg"
      position="sticky"
      top="0"
      zIndex="sticky"
    >
      {/* Left: Hamburger (mobile) + Logo */}
      <HStack gap="3" minW="0">
        <IconButton
          aria-label="Abrir menu"
          variant="ghost"
          size="sm"
          display={{ base: 'flex', lg: 'none' }}
          onClick={onMenuClick}
        >
          <LuMenu />
        </IconButton>
        <IconButton
          aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Retrair menu lateral'}
          title={sidebarCollapsed ? 'Expandir menu lateral' : 'Retrair menu lateral'}
          variant="ghost"
          size="sm"
          display={{ base: 'none', lg: 'flex' }}
          onClick={onSidebarToggle}
        >
          {sidebarCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
        </IconButton>
        <Flex align="center" gap="2">
          <Box w="7" h="7" rounded="lg" bg="white" overflow="hidden" flexShrink="0">
            <Image src="/cobcom-logo.png" alt="CobCom" w="full" h="full" objectFit="contain" />
          </Box>
          <HStack gap="2" minW="0" display={{ base: 'none', sm: 'flex' }}>
            <Text fontWeight="bold" fontSize="md" color="fg" whiteSpace="nowrap">CobCom - CRM</Text>
            {creditorName && (
              <Text fontSize="sm" color="fg.muted" fontWeight="medium" truncate maxW={{ sm: '150px', lg: '260px' }} title={creditorName}>
                · {creditorName}
              </Text>
            )}
          </HStack>
        </Flex>
      </HStack>

      {/* Center: Global Search */}
      {!creditorId && (
        <Flex
          order={{ base: 3, lg: 0 }}
          flex={{ base: '0 0 100%', lg: '1' }}
          minW="0"
          justify="center"
          mx={{ base: '0', lg: '4' }}
        >
          <GlobalSearchBar alwaysExpanded />
        </Flex>
      )}

      {/* Right: User Menu */}
      <HStack gap="1" ms="auto" flexShrink="0">
        <IconButton
          aria-label={colorMode === 'light' ? 'Modo escuro' : 'Modo claro'}
          variant="ghost"
          size="sm"
          onClick={toggleColorMode}
        >
          {colorMode === 'light' ? <LuMoon /> : <LuSun />}
        </IconButton>

        <Menu.Root>
          <Menu.Trigger asChild>
            <Flex
              as="button"
              align="center"
              gap="2"
              px="2"
              py="1.5"
              rounded="lg"
              cursor="pointer"
              _hover={{ bg: 'sidebar.hover' }}
              aria-label="Menu do usuário"
            >
              <Box
                w="8"
                h="8"
                rounded="full"
                bg="brand.solid"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                fontWeight="bold"
              >
                {initials}
              </Box>
              <Box display={{ base: 'none', md: 'block' }} textAlign="start" maxW="180px">
                <Text fontSize="sm" fontWeight="medium" lineHeight="tight" truncate>
                  {userName}
                </Text>
                {role && (
                  <Badge size="xs" variant="subtle" colorPalette="blue" mt="0.5">
                    {role}
                  </Badge>
                )}
              </Box>
            </Flex>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="180px">
                <Menu.Item value="sessions" onClick={() => navigate('/sessions')}>
                  <LuUser />
                  <Box flex="1">Sessões</Box>
                </Menu.Item>
                <Menu.Item value="change-password" onClick={() => navigate('/change-password')}>
                  <LuKey />
                  <Box flex="1">Alterar Senha</Box>
                </Menu.Item>
                <Separator />
                <Menu.Item value="logout" onClick={handleLogout} color="fg.error">
                  <LuLogOut />
                  <Box flex="1">Sair</Box>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
    </Flex>
  );
}
