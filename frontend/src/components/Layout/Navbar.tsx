import { Box, Flex, Button, useColorMode, useColorModeValue, Text, HStack, IconButton } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useDapp } from '../../contexts/DappProvider';
import { shortenAddress } from '../../utils/address';

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isLoggedIn, address, login, logout } = useDapp();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box as="header" borderBottom="1px" borderColor={borderColor} bg={bg} position="sticky" top={0} zIndex={10}>
      <Flex maxW="container.xl" mx="auto" px={4} py={3} justify="space-between" align="center">
        <Text fontSize="xl" fontWeight="bold" color="brand.500">
          MetaShipX
        </Text>

        <HStack spacing={4}>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
          />
          
          {isLoggedIn ? (
            <Button
              variant="outline"
              colorScheme="brand"
              onClick={logout}
              size="sm"
            >
              {shortenAddress(address)}
            </Button>
          ) : (
            <Button
              colorScheme="brand"
              size="sm"
              onClick={() => login('wallet')}
            >
              Connect Wallet
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default Navbar;
