import { useEffect, useRef } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Button,
  SimpleGrid, Flex, Badge, Divider, Icon,
  useColorModeValue, keyframes,
} from '@chakra-ui/react';
import { useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { useNavigate } from 'react-router-dom';
import { useDapp } from '../contexts/DappProvider';

const STATS = [
  { label: 'Meciuri jucate', value: '12,847', icon: '⚔️', color: 'blue' },
  { label: 'EGLD mizate', value: '3,241', icon: '💎', color: 'purple' },
  { label: 'Nave minted', value: '8,502', icon: '⚓', color: 'cyan' },
  { label: 'EGLD în staking', value: '18,940', icon: '🏦', color: 'green' },
];

const FEATURES = [
  {
    icon: '⚔️',
    title: 'Battleship On-Chain',
    desc: 'Joacă Battleship clasic cu un adversar real. Miza e reală — câștigătorul ia tot.',
    color: 'blue',
    cta: 'Joacă Acum',
    href: '/game',
  },
  {
    icon: '⚓',
    title: 'NFT Shipyard',
    desc: 'Mintează nave SFT unice pe MultiversX. Upgradeează-le și folosește-le în luptă.',
    color: 'purple',
    cta: 'Mintează Navă',
    href: '/marketplace',
  },
  {
    icon: '💎',
    title: 'Staking Pool',
    desc: 'Stakeează EGLD și câștigă 20% APR din taxele meciurilor. Fără lock-up.',
    color: 'green',
    cta: 'Stakeează EGLD',
    href: '/staking',
  },
];

const STEPS = [
  { n: '01', title: 'Conectează Wallet-ul', desc: 'MultiversX Wallet, xPortal sau Ledger. 1 click.' },
  { n: '02', title: 'Mintează o Navă', desc: 'Alege tipul, dă-i un nume și o ai on-chain.' },
  { n: '03', title: 'Provoacă un Adversar', desc: 'Creează un meci cu pariu EGLD și trimite ID-ul.' },
  { n: '04', title: 'Câștigă și Stakeează', desc: 'Ia EGLD-ul adversarului și pune-l la staking.' },
];

export default function HomePage() {
  const isLoggedIn = useGetIsLoggedIn();
  const navigate = useNavigate();
  const { login } = useDapp();
  const bgGrad = useColorModeValue(
    'linear(to-b, gray.900, blue.900, gray.900)',
    'linear(to-b, gray.900, blue.950, gray.900)'
  );

  return (
    <Box>
      {/* HERO */}
      <Box
        bgGradient="linear(to-b, gray.900 0%, blue.950 50%, gray.900 100%)"
        position="relative"
        overflow="hidden"
        py={{ base: 20, md: 32 }}
      >
        {/* Grid background */}
        <Box
          position="absolute" inset={0} opacity={0.06}
          bgImage="repeating-linear-gradient(0deg, #4299e1 0px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #4299e1 0px, transparent 1px, transparent 60px)"
          bgSize="60px 60px"
        />
        {/* Glow orbs */}
        <Box position="absolute" top="15%" left="8%" w="300px" h="300px"
          borderRadius="full" bg="blue.500" opacity={0.07} filter="blur(80px)" />
        <Box position="absolute" bottom="20%" right="8%" w="250px" h="250px"
          borderRadius="full" bg="purple.500" opacity={0.08} filter="blur(70px)" />

        <Container maxW="container.xl" position="relative">
          <VStack spacing={8} textAlign="center">
            <Badge colorScheme="blue" variant="outline" fontSize="sm" px={4} py={1} borderRadius="full" letterSpacing="wider">
              ⚓ POWERED BY MULTIVERSX
            </Badge>

            <Heading
              fontSize={{ base: '4xl', md: '6xl', lg: '7xl' }}
              fontWeight={900}
              lineHeight={1.1}
              bgGradient="linear(to-r, blue.300, cyan.300, blue.200)"
              bgClip="text"
            >
              Battleship.
              <br />
              <Box as="span" bgGradient="linear(to-r, purple.300, pink.300)" bgClip="text">
                On-Chain.
              </Box>
            </Heading>

            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              color="gray.400"
              maxW="600px"
              lineHeight={1.7}
            >
              Joacă Battleship clasic cu mizare EGLD reală.
              Mintează nave NFT, upgradează-le și câștigă recompense din staking.
            </Text>

            <HStack spacing={4} flexWrap="wrap" justify="center">
              {isLoggedIn ? (
                <>
                  <Button
                    colorScheme="blue" size="lg" px={8} h={14} fontSize="lg"
                    onClick={() => navigate('/game')}
                    _hover={{ transform: 'translateY(-2px)', shadow: '0 0 30px rgba(66,153,225,0.5)' }}
                    transition="all 0.2s"
                  >
                    ⚔️ Joacă Acum
                  </Button>
                  <Button
                    variant="outline" colorScheme="purple" size="lg" px={8} h={14} fontSize="lg"
                    onClick={() => navigate('/marketplace')}
                    _hover={{ transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    ⚓ Mintează Navă
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    colorScheme="blue" size="lg" px={10} h={14} fontSize="lg"
                    onClick={() => login('wallet')}
                    _hover={{ transform: 'translateY(-2px)', shadow: '0 0 30px rgba(66,153,225,0.5)' }}
                    transition="all 0.2s"
                  >
                    🔗 Conectează Wallet
                  </Button>
                  <Button
                    variant="ghost" colorScheme="gray" size="lg" px={8} h={14}
                    onClick={() => navigate('/marketplace')}
                  >
                    Explorează →
                  </Button>
                </>
              )}
            </HStack>

            {/* Stats row */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6} mt={8} w="full" maxW="800px">
              {STATS.map(s => (
                <Box
                  key={s.label}
                  p={4} borderRadius="xl"
                  bg="whiteAlpha.50" border="1px" borderColor="whiteAlpha.100"
                  backdropFilter="blur(10px)"
                  textAlign="center"
                >
                  <Text fontSize="2xl" mb={1}>{s.icon}</Text>
                  <Text fontWeight={800} fontSize="xl" color="white">{s.value}</Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>{s.label}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* FEATURES */}
      <Box py={{ base: 16, md: 24 }} bg="gray.900">
        <Container maxW="container.xl">
          <VStack spacing={12}>
            <VStack spacing={3} textAlign="center">
              <Text color="blue.400" fontWeight="bold" letterSpacing="wider" fontSize="sm">DE CE METASHIPX</Text>
              <Heading size="xl" color="white">Tot ce ai nevoie într-un singur joc</Heading>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} w="full">
              {FEATURES.map(f => (
                <Box
                  key={f.title}
                  p={8} borderRadius="2xl"
                  bg="gray.800" border="1px" borderColor="gray.700"
                  transition="all 0.3s"
                  _hover={{ transform: 'translateY(-6px)', borderColor: `${f.color}.500`, shadow: `0 20px 40px rgba(0,0,0,0.3)` }}
                  cursor="pointer"
                  onClick={() => navigate(f.href)}
                >
                  <VStack align="start" spacing={4}>
                    <Flex
                      w={14} h={14} borderRadius="xl" fontSize="2xl"
                      justify="center" align="center"
                      bg={`${f.color}.900`} border="1px" borderColor={`${f.color}.700`}
                    >
                      {f.icon}
                    </Flex>
                    <VStack align="start" spacing={2}>
                      <Heading size="md" color="white">{f.title}</Heading>
                      <Text color="gray.400" lineHeight={1.7}>{f.desc}</Text>
                    </VStack>
                    <Button
                      colorScheme={f.color as any} variant="ghost" size="sm" px={0}
                      rightIcon={<Text>→</Text>}
                      _hover={{ bg: 'transparent', color: `${f.color}.200` }}
                    >
                      {f.cta}
                    </Button>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* HOW IT WORKS */}
      <Box py={{ base: 16, md: 24 }} bg="gray.950">
        <Container maxW="container.lg">
          <VStack spacing={12}>
            <VStack spacing={3} textAlign="center">
              <Text color="purple.400" fontWeight="bold" letterSpacing="wider" fontSize="sm">GHID RAPID</Text>
              <Heading size="xl" color="white">Cum funcționează?</Heading>
            </VStack>

            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={6} w="full">
              {STEPS.map((step, i) => (
                <Box key={step.n} position="relative">
                  {i < STEPS.length - 1 && (
                    <Box
                      display={{ base: 'none', lg: 'block' }}
                      position="absolute" top="24px" left="calc(100% - 12px)"
                      w="24px" h="2px" bg="gray.600"
                    />
                  )}
                  <VStack align="start" spacing={3} p={5} borderRadius="xl" bg="gray.800" border="1px" borderColor="gray.700" h="full">
                    <Text fontWeight={800} fontSize="3xl" color="blue.700" lineHeight={1}>{step.n}</Text>
                    <Text fontWeight={700} color="white" fontSize="md">{step.title}</Text>
                    <Text color="gray.400" fontSize="sm" lineHeight={1.6}>{step.desc}</Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* CTA BANNER */}
      <Box
        py={{ base: 16, md: 24 }}
        bgGradient="linear(to-r, blue.900, purple.900)"
        position="relative" overflow="hidden"
      >
        <Box position="absolute" inset={0} opacity={0.05}
          bgImage="repeating-linear-gradient(45deg, #fff 0px, transparent 1px, transparent 20px, #fff 21px)"
          bgSize="30px 30px"
        />
        <Container maxW="container.md" position="relative">
          <VStack spacing={6} textAlign="center">
            <Heading size="xl" color="white">Gata să iei în luptă?</Heading>
            <Text color="blue.200" fontSize="lg" maxW="480px">
              Conectează wallet-ul și începe primul meci. Primele 24h — taxe zero.
            </Text>
            <HStack spacing={4} flexWrap="wrap" justify="center">
              {isLoggedIn ? (
                <Button colorScheme="blue" size="lg" px={10} h={14} fontSize="lg" onClick={() => navigate('/game')}>
                  ⚔️ Joacă Acum
                </Button>
              ) : (
                <Button
                  colorScheme="blue" size="lg" px={10} h={14} fontSize="lg"
                  onClick={() => login('wallet')}
                  _hover={{ transform: 'translateY(-2px)', shadow: '0 0 40px rgba(66,153,225,0.6)' }}
                  transition="all 0.2s"
                >
                  🔗 Conectează Wallet
                </Button>
              )}
              <Button variant="outline" colorScheme="whiteAlpha" size="lg" px={8} h={14} onClick={() => navigate('/staking')}>
                💎 Staking Pool
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}
