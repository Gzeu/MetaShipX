import { Box, Container, Flex, Text, Link, useColorModeValue } from '@chakra-ui/react';

const Footer = () => {
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bg = useColorModeValue('white', 'gray.800');

  return (
    <Box as="footer" borderTop="1px" borderColor={borderColor} bg={bg} py={4}>
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Text fontSize="sm" color="gray.500">
            © {new Date().getFullYear()} MetaShipX. All rights reserved.
          </Text>
          <Flex gap={4}>
            <Link href="/terms" fontSize="sm" color="gray.500" _hover={{ color: 'brand.500' }}>
              Terms
            </Link>
            <Link href="/privacy" fontSize="sm" color="gray.500" _hover={{ color: 'brand.500' }}>
              Privacy
            </Link>
            <Link 
              href="https://github.com/yourusername/metashipx" 
              isExternal
              fontSize="sm" 
              color="gray.500" 
              _hover={{ color: 'brand.500' }}
            >
              GitHub
            </Link>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};

export default Footer;
