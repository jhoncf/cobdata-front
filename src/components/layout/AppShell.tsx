import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Flex, CloseButton, Drawer, Portal } from '@chakra-ui/react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AppBreadcrumb } from './AppBreadcrumb';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Flex h="dvh" direction="column">
      {/* Header */}
      <Header onMenuClick={() => setDrawerOpen(true)} />

      <Flex flex="1" overflow="hidden">
        {/* Desktop Sidebar */}
        <Box
          as="nav"
          w="60"
          borderRightWidth="1px"
          borderColor="sidebar.border"
          overflowY="auto"
          display={{ base: 'none', lg: 'block' }}
          bg="sidebar.bg"
          flexShrink={0}
        >
          <Sidebar />
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
          overflowY="auto"
          bg="content.bg"
          p={{ base: '4', md: '6' }}
        >
          <Box maxW="7xl" mx="auto">
            <AppBreadcrumb />
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}
