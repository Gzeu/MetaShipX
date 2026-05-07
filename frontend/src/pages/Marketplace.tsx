import { useState } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Button,
  SimpleGrid, Badge, useToast, Spinner, Flex,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, Image, Progress, Divider, Tabs, TabList, Tab, TabPanels, TabPanel,
  Stat, StatLabel, StatNumber,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Alert, AlertIcon, Select,
} from '@chakra-ui/react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { useNft } from '../hooks/useNft';

const SHIP_TYPES = [
  { id: 0, name: 'Destroyer', emoji: '🚤', size: 2, description: 'Rapid și agil. Ideal pentru atac fulger.', rarity: 'Common', color: 'gray' },
  { id: 1, name: 'Submarine', emoji: '🤿', size: 3, description: 'Operat invizibil. Atacuri surpriză.', rarity: 'Uncommon', color: 'blue' },
  { id: 2, name: 'Cruiser', emoji: '⛵', size: 3, description: 'Versatil și robust. Echibruat în orice situație.', rarity: 'Uncommon', color: 'cyan' },
  { id: 3, name: 'Battleship', emoji: '🛳️', size: 4, description: 'Forța brutală a flotei. Greu de distrus.', rarity: 'Rare', color: 'purple' },
  { id: 4, name: 'Carrier', emoji: '✈️', size: 5, description: 'Nava amiral. Comandă întreaga flotă.', rarity: 'Legendary', color: 'yellow' },
];

const RARITY_COLORS: Record<string, string> = {
  Common: 'gray', Uncommon: 'blue', Rare: 'purple', Legendary: 'yellow',
};

const MINT_PRICE_EGLD: Record<number, number> = {
  0: 0.05, 1: 0.08, 2: 0.08, 3: 0.15, 4: 0.30,
};

interface ShipNft {
  nonce: number;
  shipType: number;
  name: string;
  level: number;
  wins: number;
  owner: string;
}

export default function MarketplacePage() {
  const { address } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();
  const toast = useToast();
  const { isOpen: isMintOpen, onOpen: onMintOpen, onClose: onMintClose } = useDisclosure();
  const { isOpen: isUpgradeOpen, onOpen: onUpgradeOpen, onClose: onUpgradeClose } = useDisclosure();

  const { userShips, mintShip, upgradeShip, mintPrice, isLoading, refetch } = useNft();

  const [selectedType, setSelectedType] = useState(0);
  const [selectedShip, setSelectedShip] = useState<ShipNft | null>(null);
  const [shipName, setShipName] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  const handleMint = async () => {
    if (!shipName.trim()) { toast({ title: 'Introdu un nume pentru navă', status: 'warning' }); return; }
    setTxLoading(true);
    try {
      await mintShip(selectedType, shipName.trim());
      toast({ title: '✅ Navă mintată!', description: `${SHIP_TYPES[selectedType].emoji} ${shipName} a fost adăugată colecției tale`, status: 'success', duration: 5000 });
      await refetch();
      onMintClose();
      setShipName('');
    } catch (e: any) {
      toast({ title: 'Eroare mint', description: e.message, status: 'error' });
    } finally { setTxLoading(false); }
  };

  const handleUpgrade = async () => {
    if (!selectedShip) return;
    setTxLoading(true);
    try {
      await upgradeShip(selectedShip.nonce);
      toast({ title: '⬆️ Upgrade reușit!', description: `Nava a atins level ${selectedShip.level + 1}`, status: 'success' });
      await refetch();
      onUpgradeClose();
    } catch (e: any) {
      toast({ title: 'Eroare upgrade', description: e.message, status: 'error' });
    } finally { setTxLoading(false); }
  };

  const openUpgrade = (ship: ShipNft) => {
    setSelectedShip(ship);
    onUpgradeOpen();
  };

  const upgradePrice = selectedShip ? (MINT_PRICE_EGLD[selectedShip.shipType] * selectedShip.level).toFixed(3) : '0';

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="xl" bgGradient="linear(to-r, purple.400, pink.400)" bgClip="text">🛒 NFT Shipyard</Heading>
            <Text color="gray.400">Mintează nave SFT pe MultiversX. Upgradeează și câștigă victorii.</Text>
          </VStack>
          <Button colorScheme="purple" size="lg" onClick={() => { setSelectedType(0); onMintOpen(); }} isDisabled={!isLoggedIn}>
            ⚓ Mint Navă
          </Button>
        </HStack>

        <Tabs variant="enclosed" colorScheme="purple">
          <TabList>
            <Tab>🏪 Catalog Nave</Tab>
            <Tab>🎒 Colecția Mea {userShips?.length ? `(${userShips.length})` : ''}</Tab>
          </TabList>
          <TabPanels>
            {/* CATALOG */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
                {SHIP_TYPES.map(ship => (
                  <Box
                    key={ship.id}
                    borderRadius="2xl" overflow="hidden"
                    bg="gray.800" border="1px" borderColor="gray.700"
                    shadow="lg" transition="all 0.2s"
                    _hover={{ transform: 'translateY(-4px)', shadow: '2xl', borderColor: `${ship.color}.500` }}
                  >
                    <Flex
                      h="140px" justify="center" align="center" fontSize="6xl"
                      bgGradient={`linear(to-br, ${ship.color}.900, gray.900)`}
                    >
                      {ship.emoji}
                    </Flex>
                    <Box p={5}>
                      <HStack justify="space-between" mb={2}>
                        <Heading size="md" color="white">{ship.name}</Heading>
                        <Badge colorScheme={RARITY_COLORS[ship.rarity]} variant="solid">{ship.rarity}</Badge>
                      </HStack>
                      <Text color="gray.400" fontSize="sm" mb={3}>{ship.description}</Text>
                      <HStack spacing={4} mb={4}>
                        <Box textAlign="center">
                          <Text color="gray.500" fontSize="xs">Dimensiune</Text>
                          <Text fontWeight="bold" color="cyan.300">{ship.size} celule</Text>
                        </Box>
                        <Box textAlign="center">
                          <Text color="gray.500" fontSize="xs">Preț mint</Text>
                          <Text fontWeight="bold" color="green.300">{MINT_PRICE_EGLD[ship.id]} EGLD</Text>
                        </Box>
                      </HStack>
                      <Button
                        colorScheme={ship.color === 'gray' ? 'whiteAlpha' : ship.color as any}
                        w="full" size="sm"
                        onClick={() => { setSelectedType(ship.id); onMintOpen(); }}
                        isDisabled={!isLoggedIn}
                      >
                        ⚓ Mint {ship.name}
                      </Button>
                    </Box>
                  </Box>
                ))}
              </SimpleGrid>
            </TabPanel>

            {/* MY SHIPS */}
            <TabPanel px={0}>
              {isLoading ? (
                <Flex justify="center" py={16}><Spinner color="purple.400" size="xl" /></Flex>
              ) : !isLoggedIn ? (
                <Flex justify="center" py={16}><Text color="gray.500">Conectează-te pentru a vedea colecția</Text></Flex>
              ) : !userShips?.length ? (
                <VStack spacing={4} py={16} textAlign="center">
                  <Text fontSize="4xl">⚓</Text>
                  <Heading size="md" color="gray.500">Flota ta e goală</Heading>
                  <Text color="gray.600">Mintează prima navă pentru a începe.</Text>
                  <Button colorScheme="purple" onClick={() => { setSelectedType(0); onMintOpen(); }}>⚓ Mint Prima Navă</Button>
                </VStack>
              ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
                  {(userShips as ShipNft[]).map(ship => {
                    const type = SHIP_TYPES[ship.shipType] || SHIP_TYPES[0];
                    return (
                      <Box
                        key={ship.nonce}
                        borderRadius="2xl" overflow="hidden"
                        bg="gray.800" border="1px" borderColor="gray.700" shadow="lg"
                      >
                        <Flex
                          h="100px" justify="center" align="center" fontSize="5xl"
                          bgGradient={`linear(to-br, ${type.color}.900, gray.900)`}
                          position="relative"
                        >
                          {type.emoji}
                          <Badge
                            position="absolute" top={2} right={2}
                            colorScheme="yellow" variant="solid"
                          >Lv.{ship.level}</Badge>
                        </Flex>
                        <Box p={4}>
                          <HStack justify="space-between" mb={1}>
                            <Text fontWeight="bold" color="white">{ship.name}</Text>
                            <Badge colorScheme={RARITY_COLORS[type.rarity]}>{type.rarity}</Badge>
                          </HStack>
                          <Text color="gray.400" fontSize="xs" mb={3}>{type.name} · Nonce #{ship.nonce}</Text>
                          <SimpleGrid columns={2} spacing={2} mb={4}>
                            <Stat size="sm">
                              <StatLabel color="gray.500">Victorii</StatLabel>
                              <StatNumber color="yellow.300" fontSize="lg">{ship.wins}</StatNumber>
                            </Stat>
                            <Stat size="sm">
                              <StatLabel color="gray.500">Level</StatLabel>
                              <StatNumber color="cyan.300" fontSize="lg">{ship.level}/10</StatNumber>
                            </Stat>
                          </SimpleGrid>
                          <Progress value={ship.level * 10} colorScheme="cyan" borderRadius="full" size="xs" mb={3} />
                          <Button
                            colorScheme="purple" variant="outline" w="full" size="sm"
                            onClick={() => openUpgrade(ship)}
                            isDisabled={ship.level >= 10}
                          >
                            {ship.level >= 10 ? '✨ Max Level' : `⬆️ Upgrade (${(MINT_PRICE_EGLD[ship.shipType] * ship.level).toFixed(3)} EGLD)`}
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* MINT MODAL */}
      <Modal isOpen={isMintOpen} onClose={onMintClose} isCentered size="md">
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent bg="gray.800" border="1px" borderColor="gray.700">
          <ModalHeader color="white">⚓ Mint {SHIP_TYPES[selectedType]?.name}</ModalHeader>
          <ModalCloseButton color="gray.400" />
          <ModalBody>
            <VStack spacing={4}>
              <Flex w="full" h="100px" justify="center" align="center" fontSize="5xl"
                borderRadius="xl" bgGradient={`linear(to-br, ${SHIP_TYPES[selectedType]?.color}.900, gray.900)`}>
                {SHIP_TYPES[selectedType]?.emoji}
              </Flex>
              <Box w="full">
                <Text color="gray.400" fontSize="sm" mb={1}>Selectează tipul</Text>
                <Select
                  bg="gray.900" value={selectedType}
                  onChange={e => setSelectedType(Number(e.target.value))}
                >
                  {SHIP_TYPES.map(s => (
                    <option key={s.id} value={s.id}>{s.emoji} {s.name} — {MINT_PRICE_EGLD[s.id]} EGLD</option>
                  ))}
                </Select>
              </Box>
              <Box w="full">
                <Text color="gray.400" fontSize="sm" mb={1}>Nume navă</Text>
                <NumberInput isRequired={false} />
                <input
                  style={{ width: '100%', background: '#1a202c', border: '1px solid #4a5568', borderRadius: '6px', padding: '8px 12px', color: 'white', fontSize: '14px' }}
                  placeholder="ex: HMS Neptun, Shadow Wolf..."
                  value={shipName}
                  onChange={e => setShipName(e.target.value)}
                  maxLength={50}
                />
              </Box>
              <Alert status="info" borderRadius="lg" bg="blue.900" w="full">
                <AlertIcon />
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="bold">Cost: {MINT_PRICE_EGLD[selectedType]} EGLD</Text>
                  <Text fontSize="xs" color="gray.300">{SHIP_TYPES[selectedType]?.description}</Text>
                </VStack>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onMintClose} color="gray.400">Anulează</Button>
            <Button colorScheme="purple" onClick={handleMint} isLoading={txLoading} isDisabled={!shipName.trim()}>
              ⚓ Mintează
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* UPGRADE MODAL */}
      <Modal isOpen={isUpgradeOpen} onClose={onUpgradeClose} isCentered size="md">
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent bg="gray.800" border="1px" borderColor="gray.700">
          <ModalHeader color="white">⬆️ Upgrade {selectedShip?.name}</ModalHeader>
          <ModalCloseButton color="gray.400" />
          <ModalBody>
            {selectedShip && (
              <VStack spacing={4}>
                <Flex w="full" h="80px" justify="center" align="center" fontSize="4xl"
                  borderRadius="xl" bgGradient={`linear(to-br, ${SHIP_TYPES[selectedShip.shipType]?.color}.900, gray.900)`}>
                  {SHIP_TYPES[selectedShip.shipType]?.emoji}
                  <Badge ml={2} colorScheme="yellow" fontSize="lg">Lv.{selectedShip.level}</Badge>
                  <Text mx={2} color="gray.400">→</Text>
                  <Badge colorScheme="green" fontSize="lg">Lv.{selectedShip.level + 1}</Badge>
                </Flex>
                <SimpleGrid columns={2} spacing={4} w="full">
                  <Box p={3} bg="gray.900" borderRadius="lg" textAlign="center">
                    <Text color="gray.500" fontSize="xs">Level curent</Text>
                    <Text color="cyan.300" fontWeight="bold" fontSize="xl">{selectedShip.level}</Text>
                  </Box>
                  <Box p={3} bg="gray.900" borderRadius="lg" textAlign="center">
                    <Text color="gray.500" fontSize="xs">Level nou</Text>
                    <Text color="green.300" fontWeight="bold" fontSize="xl">{selectedShip.level + 1}</Text>
                  </Box>
                </SimpleGrid>
                <Alert status="warning" borderRadius="lg" bg="orange.900" w="full">
                  <AlertIcon />
                  <Text fontSize="sm">Cost upgrade: <strong>{upgradePrice} EGLD</strong> (level × preț bază)</Text>
                </Alert>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onUpgradeClose} color="gray.400">Anulează</Button>
            <Button colorScheme="green" onClick={handleUpgrade} isLoading={txLoading}>
              ⬆️ Upgrade
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
