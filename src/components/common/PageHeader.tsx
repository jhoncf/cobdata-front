import { Flex, Heading } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <Flex
      justify="space-between"
      align="center"
      mb="5"
      gap="4"
      wrap="wrap"
    >
      <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" letterSpacing="-0.02em" minW="0">
        {title}
      </Heading>
      {children && <Flex gap="2" align="center" wrap="wrap" w={{ base: 'full', sm: 'auto' }} justify={{ base: 'flex-start', sm: 'flex-end' }}>{children}</Flex>}
    </Flex>
  );
}
