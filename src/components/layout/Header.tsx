import { useState } from 'react';
import { Box, Flex, HStack, IconButton, Text, Badge, Portal, Menu, Separator } from '@chakra-ui/react';
import { LuMenu, LuMoon, LuSun, LuLogOut, LuUser, LuKey } from 'react-icons/lu';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { userName, role } = useAuth();
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
      h="14"
      px="4"
      align="center"
      borderBottomWidth="1px"
      borderColor="sidebar.border"
      bg="sidebar.bg"
      position="sticky"
      top="0"
      zIndex="sticky"
    >
      {/* Left: Hamburger (mobile) + Logo */}
      <HStack gap="3">
        <IconButton
          aria-label="Abrir menu"
          variant="ghost"
          size="sm"
          display={{ base: 'flex', lg: 'none' }}
          onClick={onMenuClick}
        >
          <LuMenu />
        </IconButton>
        <Flex align="center" gap="2">
          <Box
            w="7"
            h="7"
            rounded="lg"
            bg="brand.solid"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="xs" fontWeight="bold" color="white">
              CD
            </Text>
          </Box>
          <Text fontWeight="bold" fontSize="md" color="fg">
            CobData
          </Text>
        </Flex>
      </HStack>

      {/* Right: User Menu */}
      <HStack ml="auto" gap="1">
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
              <Box display={{ base: 'none', md: 'block' }} textAlign="start">
                <Text fontSize="sm" fontWeight="medium" lineHeight="tight">
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
