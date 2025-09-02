import { Box, Flex, Container, useColorMode } from '@chakra-ui/react';
import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const { colorMode } = useColorMode();

  return (
    <Flex direction="column" minH="100vh">
      <Navbar />
      <Box as="main" flex={1} py={8} bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}>
        <Container maxW="container.xl">{children}</Container>
      </Box>
      <Footer />
    </Flex>
  );
};

export default Layout;
