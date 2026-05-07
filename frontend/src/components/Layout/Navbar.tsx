import {
  Box, Flex, Button, Text, HStack, IconButton,
  Menu, MenuButton, MenuList, MenuItem, MenuDivider,
  Avatar, Badge, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, VStack, useDisclosure,
  useColorModeValue, Tooltip,
} from '@chakra-ui/react';
import { HamburgerIcon, MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useGetIsLoggedIn, useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { ExtensionLoginButton, WalletConnectLoginButton, LedgerLoginButton, WebWalletLoginButton } from '@multiversx/sdk-dapp/UI';
import { logout as mxLogout } from '@multiversx/sdk-dapp/utils';
import { useColorMode } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDapp } from '../../contexts/DappProvider';
import { shortenAddress } from '../../utils/address';

const NAV_LINKS = [
  { label: '⚔️ Joacă',        href: '/game' },
  { label: '🏆 Turnee',       href: '/tournaments' },
  { label: '🏅 Leaderboard',  href: '/leaderboard' },
  { label: '⚓ Marketplace',  href: '/marketplace' },
  { label: '💎 Staking',      href: '/staking' },
  { label: '👤 Profil',       href: '/profile' },
];

export default function Navbar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  const { isOpen: isWalletOpen, onOpen: onWalletOpen, onClose: onWalletClose } = useDisclosure();
  const isLoggedIn = useGetIsLoggedIn();
  const { address } = useGetAccountInfo();
  const navigate = useNavigate();
  const location = useLocation();

  const bg = useColorModeValue('rgba(255,255,255,0.9)', 'rgba(23,25,35,0.92)');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = () => { mxLogout(); };
  const isActive = (href: string) => location.pathname === href;

  // Split nav: primary (always visible) vs overflow (hidden on small screens)
  const PRIMARY_LINKS = NAV_LINKS.slice(0, 3);
  const MORE_LINKS    = NAV_LINKS.slice(3);

  return (
    <>
      <Box
        as="header"
        position="sticky" top={0} zIndex={100}
        borderBottom="1px" borderColor={borderColor}
        bg={bg}
        backdropFilter="blur(12px)"
        shadow="sm"
      >
        <Flex maxW="container.xl" mx="auto" px={4} py={3} justify="space-between" align="center">
          {/* Logo */}
          <HStack spacing={2} cursor="pointer" onClick={() => navigate('/')}>
            <Text fontSize="2xl">⚓</Text>
            <Text fontSize="xl" fontWeight={900} bgGradient="linear(to-r, blue.400, cyan.400)" bgClip="text">
              MetaShipX
            </Text>
          </HStack>

          {/* Desktop nav — primary 3 links always, rest in "More" menu */}
          <HStack spacing={1} display={{ base: 'none', md: 'flex' }}>
            {PRIMARY_LINKS.map(link => (
              <Button
                key={link.href}
                variant={isActive(link.href) ? 'solid' : 'ghost'}
                colorScheme={isActive(link.href) ? 'blue' : 'gray'}
                size="sm"
                onClick={() => navigate(link.href)}
              >
                {link.label}
              </Button>
            ))}
            {/* "More" dropdown for remaining links */}
            <Menu>
              <MenuButton as={Button} size="sm" variant="ghost" colorScheme="gray" rightIcon={<Text fontSize="xs">▾</Text>}>
                Mai mult
              </MenuButton>
              <MenuList bg={useColorModeValue('white', 'gray.800')} borderColor={borderColor} zIndex={200}>
                {MORE_LINKS.map(link => (
                  <MenuItem key={link.href} onClick={() => navigate(link.href)}
                    fontWeight={isActive(link.href) ? 'bold' : 'normal'}
                    color={isActive(link.href) ? 'blue.400' : undefined}
                  >
                    {link.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </HStack>

          {/* Right side */}
          <HStack spacing={2}>
            <IconButton
              aria-label="Toggle theme"
              icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
            />

            {isLoggedIn ? (
              <Menu>
                <MenuButton
                  as={Button} size="sm" variant="outline" colorScheme="blue"
                  leftIcon={<Avatar size="xs" name={address} bg="blue.500" />}
                >
                  <Text display={{ base: 'none', sm: 'inline' }}>{shortenAddress(address)}</Text>
                  <Text display={{ base: 'inline', sm: 'none' }}>Wallet</Text>
                </MenuButton>
                <MenuList bg={useColorModeValue('white', 'gray.800')} borderColor={borderColor}>
                  <Box px={4} py={2}>
                    <Text fontSize="xs" color="gray.500">Adresă</Text>
                    <Text fontSize="sm" fontWeight="bold" fontFamily="mono">{address.slice(0,12)}...{address.slice(-6)}</Text>
                  </Box>
                  <MenuDivider />
                  <MenuItem onClick={() => navigate('/profile')}   icon={<Text>👤</Text>}>Profilul Meu</MenuItem>
                  <MenuItem onClick={() => navigate('/marketplace')} icon={<Text>⚓</Text>}>Navele Mele</MenuItem>
                  <MenuItem onClick={() => navigate('/staking')}   icon={<Text>💎</Text>}>Staking</MenuItem>
                  <MenuItem onClick={() => navigate('/leaderboard')} icon={<Text>🏅</Text>}>Leaderboard</MenuItem>
                  <MenuItem onClick={() => navigate('/tournaments')} icon={<Text>🏆</Text>}>Turnee</MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout} color="red.400" icon={<Text>🚪</Text>}>Deconectează</MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button colorScheme="blue" size="sm" onClick={onWalletOpen} leftIcon={<Text fontSize="sm">🔗</Text>}>
                <Text display={{ base: 'none', sm: 'inline' }}>Conectează Wallet</Text>
                <Text display={{ base: 'inline', sm: 'none' }}>Login</Text>
              </Button>
            )}

            <IconButton
              aria-label="Menu" icon={<HamburgerIcon />} variant="ghost" size="sm"
              display={{ base: 'flex', md: 'none' }} onClick={onDrawerOpen}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isDrawerOpen} placement="right" onClose={onDrawerClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg={useColorModeValue('white', 'gray.900')}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <HStack><Text fontSize="xl">⚓</Text>
              <Text fontWeight={900} bgGradient="linear(to-r, blue.400, cyan.400)" bgClip="text">MetaShipX</Text>
            </HStack>
          </DrawerHeader>
          <DrawerBody pt={4}>
            <VStack spacing={2} align="stretch">
              {NAV_LINKS.map(link => (
                <Button key={link.href}
                  variant={isActive(link.href) ? 'solid' : 'ghost'}
                  colorScheme={isActive(link.href) ? 'blue' : 'gray'}
                  justifyContent="start"
                  onClick={() => { navigate(link.href); onDrawerClose(); }}
                >
                  {link.label}
                </Button>
              ))}
              <Box pt={4}>
                {isLoggedIn ? (
                  <Button colorScheme="red" variant="outline" w="full" onClick={handleLogout}>🚪 Deconectează</Button>
                ) : (
                  <Button colorScheme="blue" w="full" onClick={() => { onWalletOpen(); onDrawerClose(); }}>🔗 Conectează Wallet</Button>
                )}
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Wallet Login Modal */}
      <Drawer isOpen={isWalletOpen} placement="right" onClose={onWalletClose} size="sm">
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg={useColorModeValue('white', 'gray.900')}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <VStack align="start" spacing={1}>
              <Text fontWeight={900} fontSize="lg">🔗 Conectează Wallet</Text>
              <Text fontSize="sm" color="gray.500" fontWeight="normal">Alege metoda de autentificare MultiversX</Text>
            </VStack>
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} pt={4}>
              <Box w="full" borderRadius="xl" border="1px" borderColor="blue.700" overflow="hidden">
                <WalletConnectLoginButton callbackRoute="/" loginButtonText="" wrapContentInsideModal={false} isWalletConnectV2>
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full" _hover={{ bg: 'blue.900' }} transition="background 0.2s">
                    <Text fontSize="2xl">📱</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="white">xPortal App</Text>
                      <Text fontSize="xs" color="gray.400">Scanează QR cu aplicația mobilă</Text>
                    </VStack>
                    <Badge colorScheme="blue" variant="subtle">Recomandat</Badge>
                  </Flex>
                </WalletConnectLoginButton>
              </Box>
              <Box w="full" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
                <ExtensionLoginButton callbackRoute="/" loginButtonText="" wrapContentInsideModal={false}>
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full" _hover={{ bg: 'gray.800' }} transition="background 0.2s">
                    <Text fontSize="2xl">🧩</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="white">Browser Extension</Text>
                      <Text fontSize="xs" color="gray.400">MultiversX DeFi Wallet extension</Text>
                    </VStack>
                  </Flex>
                </ExtensionLoginButton>
              </Box>
              <Box w="full" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
                <WebWalletLoginButton callbackRoute="/" loginButtonText="" wrapContentInsideModal={false}>
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full" _hover={{ bg: 'gray.800' }} transition="background 0.2s">
                    <Text fontSize="2xl">🌐</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="white">Web Wallet</Text>
                      <Text fontSize="xs" color="gray.400">wallet.multiversx.com</Text>
                    </VStack>
                  </Flex>
                </WebWalletLoginButton>
              </Box>
              <Box w="full" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
                <LedgerLoginButton callbackRoute="/" loginButtonText="" wrapContentInsideModal={false}>
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full" _hover={{ bg: 'gray.800' }} transition="background 0.2s">
                    <Text fontSize="2xl">🔐</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="white">Ledger Hardware</Text>
                      <Text fontSize="xs" color="gray.400">Conectare prin hardware wallet</Text>
                    </VStack>
                  </Flex>
                </LedgerLoginButton>
              </Box>
              <Text fontSize="xs" color="gray.600" textAlign="center" pt={2}>
                Prin conectare, accepți că tranzacțiile sunt ireversibile pe blockchain.
              </Text>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
