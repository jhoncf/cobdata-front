import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import {
  LuLayoutDashboard,
  LuBuilding2,
  LuWallet,
  LuUpload,
  LuSend,
  LuUsers,
  LuSettings,
  LuShield,
  LuScrollText,
  LuCreditCard,
} from 'react-icons/lu';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: ('ADMIN' | 'OPERATIONAL' | 'VIEWER')[];
  section?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LuLayoutDashboard, section: 'Principal' },
  { label: 'Credores', path: '/creditors', icon: LuBuilding2, section: 'Gestão' },
  { label: 'Carteiras', path: '/wallets', icon: LuWallet, section: 'Gestão' },

  { label: 'Importações', path: '/imports', icon: LuUpload, section: 'Operacional' },
  { label: 'Operações', path: '/operations', icon: LuSend, section: 'Operacional' },
  { label: 'Usuários', path: '/users', icon: LuUsers, roles: ['ADMIN'], section: 'Administração' },
  { label: 'Canais', path: '/providers', icon: LuSettings, roles: ['ADMIN', 'OPERATIONAL'], section: 'Administração' },
  { label: 'Meios de pagamento', path: '/payment-gateways', icon: LuCreditCard, roles: ['ADMIN'], section: 'Administração' },
    { label: 'Auditoria', path: '/audit', icon: LuScrollText, roles: ['ADMIN'], section: 'Administração' },
  { label: 'Sessões', path: '/sessions', icon: LuShield, section: 'Administração' },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return role ? item.roles.includes(role) : false;
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose?.();
  };

  // Group items by section
  const sections = visibleItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const section = item.section ?? 'Outros';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  return (
    <VStack gap="2" align="stretch" py="4" px="3" h="full">
      {Object.entries(sections).map(([sectionName, items]) => (
        <Box key={sectionName}>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color="fg.subtle"
            textTransform="uppercase"
            letterSpacing="wider"
            px="3"
            mb="1.5"
            mt="2"
          >
            {sectionName}
          </Text>
          <VStack gap="0.5" align="stretch">
            {items.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/');

              const IconComp = item.icon;

              return (
                <Flex
                  key={item.path}
                  as="button"
                  align="center"
                  gap="3"
                  px="3"
                  py="2"
                  rounded="lg"
                  cursor="pointer"
                  fontWeight={isActive ? '600' : '400'}
                  fontSize="sm"
                  bg={isActive ? 'sidebar.active' : 'transparent'}
                  color={isActive ? 'brand.fg' : 'fg.muted'}
                  borderWidth={isActive ? '1px' : '1px'}
                  borderColor={isActive ? 'brand.muted' : 'transparent'}
                  _hover={{
                    bg: isActive ? 'sidebar.active' : 'sidebar.hover',
                    color: isActive ? 'brand.fg' : 'fg',
                  }}
                  transition="all 0.15s ease"
                  onClick={() => handleNavigation(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  w="full"
                  textAlign="start"
                >
                  <Box
                    as={IconComp}
                    boxSize="4.5"
                    opacity={isActive ? 1 : 0.7}
                  />
                  <Text>{item.label}</Text>
                </Flex>
              );
            })}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}
