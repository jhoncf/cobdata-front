import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Flex, CloseButton, Drawer, Portal } from '@chakra-ui/react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AppBreadcrumb } from './AppBreadcrumb';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.sessionStorage.getItem('sidebar-collapsed') === 'true');

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.sessionStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <Flex h="dvh" direction="column">
      {/* Header */}
      <Header
        onMenuClick={() => setDrawerOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={toggleSidebar}
      />

      <Flex flex="1" overflow="hidden">
        {/* Desktop Sidebar */}
        <Box
          as="nav"
          w={sidebarCollapsed ? '16' : '60'}
          borderRightWidth="1px"
          borderColor="sidebar.border"
          overflowY="auto"
          display={{ base: 'none', lg: 'block' }}
          bg="sidebar.bg"
          flexShrink={0}
        >
          <Sidebar collapsed={sidebarCollapsed} />
        </Box>

        {/* Mobile Drawer */}
        <Drawer.Root
          placement="start"
          open={drawerOpen}
          onOpenChange={(e) => setDrawerOpen(e.open)}
        >
          <Portal>
            <Drawer.Backdrop />
            <Drawer.Positioner>
              <Drawer.Content>
                <Drawer.Header borderBottomWidth="1px">
                  <Drawer.Title>Navegação</Drawer.Title>
                  <Drawer.CloseTrigger asChild>
                    <CloseButton size="sm" />
                  </Drawer.CloseTrigger>
                </Drawer.Header>
                <Drawer.Body px="0">
                  <Sidebar onClose={() => setDrawerOpen(false)} />
                </Drawer.Body>
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>

        {/* Content Area */}
        <Box
          as="main"
          flex="1"
          minW="0"
          overflowY="auto"
          overflowX="hidden"
          bg="content.bg"
          p={{ base: '3', sm: '4', md: '6' }}
        >
          <Box w="full" minW="0">
            <AppBreadcrumb />
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}
