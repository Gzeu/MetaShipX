import {
  Box, Flex, Button, Text, HStack, IconButton,
  Menu, MenuButton, MenuList, MenuItem, MenuDivider,
  Avatar, Badge, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, VStack, useDisclosure,
  useColorModeValue, Divider,
} from '@chakra-ui/react';
import { HamburgerIcon, MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useGetIsLoggedIn, useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import {
  ExtensionLoginButton,
  WalletConnectLoginButton,
  LedgerLoginButton,
  WebWalletLoginButton,
} from '@multiversx/sdk-dapp/UI';
import { logout as mxLogout } from '@multiversx/sdk-dapp/utils';
import { useColorMode } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { shortenAddress } from '../../utils/address';

// ── Navigation structure ────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { label: '🎮 Lobby',        href: '/lobby' },
  { label: '🏆 Turnee',       href: '/tournaments' },
  { label: '🏅 Leaderboard',  href: '/leaderboard' },
];

const SECONDARY_NAV = [
  { label: '⚓ Marketplace',  href: '/marketplace' },
  { label: '💎 Staking',      href: '/staking' },
  { label: '👤 Profil',       href: '/profile' },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Active if pathname starts with href (handles /tournaments/:id etc.) */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  const { isOpen: isWalletOpen, onOpen: onWalletOpen, onClose: onWalletClose } = useDisclosure();
  const isLoggedIn = useGetIsLoggedIn();
  const { address } = useGetAccountInfo();
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const bg          = useColorModeValue('rgba(255,255,255,0.9)', 'rgba(13,16,28,0.95)');
  const borderColor = useColorModeValue('gray.200', 'gray.800');
  const menuBg      = useColorModeValue('white', 'gray.900');

  const handleLogout = () => mxLogout();

  return (
    <>
      {/* ── Sticky header ── */}
      <Box
        as="header"
        position="sticky" top={0} zIndex={100}
        borderBottom="1px" borderColor={borderColor}
        bg={bg}
        backdropFilter="blur(16px)"
        shadow="sm"
      >
        <Flex
          maxW="container.xl" mx="auto"
          px={{ base: 3, md: 6 }} py={3}
          justify="space-between" align="center"
        >
          {/* Logo */}
          <HStack
            spacing={2} cursor="pointer"
            onClick={() => navigate('/')}
            _hover={{ opacity: 0.85 }}
            transition="opacity 0.15s"
            flexShrink={0}
          >
            <Text fontSize="2xl" lineHeight={1}>⚓</Text>
            <Text
              fontSize="xl" fontWeight={900}
              bgGradient="linear(to-r, blue.400, cyan.300)"
              bgClip="text"
              letterSpacing="-0.5px"
            >
              MetaShipX
            </Text>
          </HStack>

          {/* ── Desktop nav ── */}
          <HStack spacing={1} display={{ base: 'none', lg: 'flex' }}>
            {PRIMARY_NAV.map(link => {
              const active = isActiveRoute(pathname, link.href);
              return (
                <Button
                  key={link.href}
                  variant={active ? 'solid' : 'ghost'}
                  colorScheme={active ? 'blue' : 'gray'}
                  size="sm"
                  fontWeight={active ? 700 : 500}
                  onClick={() => navigate(link.href)}
                  _hover={active ? {} : { bg: useColorModeValue('gray.100', 'gray.800') }}
                >
                  {link.label}
                </Button>
              );
            })}

            {/* "Mai mult" dropdown */}
            <Menu>
              <MenuButton
                as={Button} size="sm" variant="ghost" colorScheme="gray"
                fontWeight={SECONDARY_NAV.some(l => isActiveRoute(pathname, l.href)) ? 700 : 500}
                color={SECONDARY_NAV.some(l => isActiveRoute(pathname, l.href)) ? 'blue.400' : undefined}
              >
                Mai mult ▾
              </MenuButton>
              <MenuList bg={menuBg} borderColor={borderColor} zIndex={200} minW="180px">
                {SECONDARY_NAV.map(link => (
                  <MenuItem
                    key={link.href}
                    onClick={() => navigate(link.href)}
                    fontWeight={isActiveRoute(pathname, link.href) ? 700 : 400}
                    color={isActiveRoute(pathname, link.href) ? 'blue.400' : undefined}
                    bg={isActiveRoute(pathname, link.href)
                      ? useColorModeValue('blue.50', 'blue.900')
                      : undefined}
                  >
                    {link.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </HStack>

          {/* ── Right controls ── */}
          <HStack spacing={2}>
            {/* Theme toggle */}
            <IconButton
              aria-label="Toggle theme"
              icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
            />

            {/* Wallet / account */}
            {isLoggedIn ? (
              <Menu>
                <MenuButton
                  as={Button} size="sm" variant="outline" colorScheme="blue"
                  leftIcon={<Avatar size="xs" name={address} bg="blue.500" />}
                >
                  <Text display={{ base: 'none', sm: 'inline' }}>
                    {shortenAddress(address)}
                  </Text>
                  <Text display={{ base: 'inline', sm: 'none' }}>Wallet</Text>
                </MenuButton>
                <MenuList bg={menuBg} borderColor={borderColor} minW="220px">
                  <Box px={4} py={3}>
                    <Text fontSize="xs" color="gray.500" mb={1}>Adresă conectată</Text>
                    <Text fontSize="sm" fontWeight="bold" fontFamily="mono" noOfLines={1}>
                      {address.slice(0, 14)}…{address.slice(-6)}
                    </Text>
                  </Box>
                  <MenuDivider />
                  <MenuItem onClick={() => navigate('/lobby')}       icon={<Text>🎮</Text>}>Joacă</MenuItem>
                  <MenuItem onClick={() => navigate('/tournaments')} icon={<Text>🏆</Text>}>Turnee</MenuItem>
                  <MenuItem onClick={() => navigate('/staking')}     icon={<Text>💎</Text>}>Staking</MenuItem>
                  <MenuItem onClick={() => navigate('/marketplace')} icon={<Text>⚓</Text>}>Marketplace</MenuItem>
                  <MenuItem onClick={() => navigate('/leaderboard')} icon={<Text>🏅</Text>}>Leaderboard</MenuItem>
                  <MenuItem onClick={() => navigate('/profile')}     icon={<Text>👤</Text>}>Profil</MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout} color="red.400"   icon={<Text>🚪</Text>}>
                    Deconectează
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button
                colorScheme="blue" size="sm"
                onClick={onWalletOpen}
                leftIcon={<Text fontSize="sm">🔗</Text>}
              >
                <Text display={{ base: 'none', sm: 'inline' }}>Conectează Wallet</Text>
                <Text display={{ base: 'inline',  sm: 'none' }}>Login</Text>
              </Button>
            )}

            {/* Hamburger — mobile only */}
            <IconButton
              aria-label="Meniu"
              icon={<HamburgerIcon />}
              variant="ghost" size="sm"
              display={{ base: 'flex', lg: 'none' }}
              onClick={onDrawerOpen}
            />
          </HStack>
        </Flex>

        {/* ── Tablet sub-nav (md screens) ── */}
        <Box display={{ base: 'none', md: 'flex', lg: 'none' }} borderTop="1px" borderColor={borderColor}>
          <Flex maxW="container.xl" mx="auto" px={6} gap={1} py={1}>
            {ALL_NAV.map(link => {
              const active = isActiveRoute(pathname, link.href);
              return (
                <Button
                  key={link.href}
                  variant={active ? 'solid' : 'ghost'}
                  colorScheme={active ? 'blue' : 'gray'}
                  size="xs"
                  fontWeight={active ? 700 : 400}
                  onClick={() => navigate(link.href)}
                >
                  {link.label}
                </Button>
              );
            })}
          </Flex>
        </Box>
      </Box>

      {/* ── Mobile drawer ── */}
      <Drawer isOpen={isDrawerOpen} placement="right" onClose={onDrawerClose} size="xs">
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg={useColorModeValue('white', 'gray.950')}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <HStack>
              <Text fontSize="xl">⚓</Text>
              <Text fontWeight={900} bgGradient="linear(to-r, blue.400, cyan.300)" bgClip="text">
                MetaShipX
              </Text>
            </HStack>
          </DrawerHeader>
          <DrawerBody pt={4}>
            <VStack spacing={1} align="stretch">
              {/* Primary links */}
              {PRIMARY_NAV.map(link => {
                const active = isActiveRoute(pathname, link.href);
                return (
                  <Button
                    key={link.href}
                    variant={active ? 'solid' : 'ghost'}
                    colorScheme={active ? 'blue' : 'gray'}
                    justifyContent="start"
                    fontWeight={active ? 700 : 500}
                    onClick={() => { navigate(link.href); onDrawerClose(); }}
                  >
                    {link.label}
                  </Button>
                );
              })}

              <Divider my={2} />

              {/* Secondary links */}
              {SECONDARY_NAV.map(link => {
                const active = isActiveRoute(pathname, link.href);
                return (
                  <Button
                    key={link.href}
                    variant={active ? 'solid' : 'ghost'}
                    colorScheme={active ? 'blue' : 'gray'}
                    justifyContent="start"
                    fontWeight={active ? 700 : 500}
                    size="sm"
                    onClick={() => { navigate(link.href); onDrawerClose(); }}
                  >
                    {link.label}
                  </Button>
                );
              })}

              <Divider my={2} />

              {isLoggedIn ? (
                <Button
                  colorScheme="red" variant="outline" w="full"
                  onClick={() => { handleLogout(); onDrawerClose(); }}
                >
                  🚪 Deconectează
                </Button>
              ) : (
                <Button
                  colorScheme="blue" w="full"
                  onClick={() => { onWalletOpen(); onDrawerClose(); }}
                >
                  🔗 Conectează Wallet
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── Wallet login drawer ── */}
      <Drawer isOpen={isWalletOpen} placement="right" onClose={onWalletClose} size="sm">
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg={useColorModeValue('white', 'gray.950')}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <VStack align="start" spacing={1}>
              <Text fontWeight={900} fontSize="lg">🔗 Conectează Wallet</Text>
              <Text fontSize="sm" color="gray.500" fontWeight="normal">
                Alege metoda de autentificare MultiversX
              </Text>
            </VStack>
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} pt={4}>
              {/* xPortal */}
              <Box w="full" borderRadius="xl" border="1px" borderColor="blue.700" overflow="hidden">
                <WalletConnectLoginButton
                  callbackRoute="/lobby"
                  loginButtonText=""
                  wrapContentInsideModal={false}
                  isWalletConnectV2
                >
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full"
                    _hover={{ bg: 'blue.900' }} transition="background 0.15s">
                    <Text fontSize="2xl">📱</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="white">xPortal App</Text>
                      <Text fontSize="xs" color="gray.400">Scanează QR cu aplicația mobilă</Text>
                    </VStack>
                    <Badge colorScheme="blue" variant="subtle">Recomandat</Badge>
                  </Flex>
                </WalletConnectLoginButton>
              </Box>

              {/* Extension */}
              <Box w="full" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
                <ExtensionLoginButton callbackRoute="/lobby" loginButtonText="" wrapContentInsideModal={false}>
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full"
                    _hover={{ bg: 'gray.800' }} transition="background 0.15s">
                    <Text fontSize="2xl">🧩</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="white">Browser Extension</Text>
                      <Text fontSize="xs" color="gray.400">MultiversX DeFi Wallet extension</Text>
                    </VStack>
                  </Flex>
                </ExtensionLoginButton>
              </Box>

              {/* Web Wallet */}
              <Box w="full" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
                <WebWalletLoginButton callbackRoute="/lobby" loginButtonText="" wrapContentInsideModal={false}>
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full"
                    _hover={{ bg: 'gray.800' }} transition="background 0.15s">
                    <Text fontSize="2xl">🌐</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="white">Web Wallet</Text>
                      <Text fontSize="xs" color="gray.400">wallet.multiversx.com</Text>
                    </VStack>
                  </Flex>
                </WebWalletLoginButton>
              </Box>

              {/* Ledger */}
              <Box w="full" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
                <LedgerLoginButton callbackRoute="/lobby" loginButtonText="" wrapContentInsideModal={false}>
                  <Flex p={4} align="center" gap={4} cursor="pointer" w="full"
                    _hover={{ bg: 'gray.800' }} transition="background 0.15s">
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
