import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Grid,
  Button, Badge, Flex, Tabs, TabList, Tab, TabPanels, TabPanel,
  Skeleton, Alert, AlertIcon, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  useDisclosure, useColorModeValue, useToast, Progress,
  Stat, StatLabel, StatNumber, Divider, Tag,
} from '@chakra-ui/react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { mintShip, upgradeShip, getUserShips, getMintPrice, ShipMetadata } from '../services/nft.service';

const SHIP_TYPES = [
  { id: 0, name: 'Destroyer',  size: 2, emoji: '🚤', rarity: 'Common',    color: 'gray'   },
  { id: 1, name: 'Submarine',  size: 3, emoji: '🤿', rarity: 'Common',    color: 'gray'   },
  { id: 2, name: 'Cruiser',    size: 3, emoji: '⚓', rarity: 'Rare',      color: 'blue'   },
  { id: 3, name: 'Battleship', size: 4, emoji: '🛳', rarity: 'Epic',      color: 'purple' },
  { id: 4, name: 'Carrier',    size: 5, emoji: '✈️', rarity: 'Legendary', color: 'yellow' },
];

const RARITY_PRICE: Record<string, string> = {
  Common: '0.05', Rare: '0.1', Epic: '0.25', Legendary: '0.5',
};

function ShipCard({ ship, onUpgrade }: { ship: ShipMetadata; onUpgrade: (s: ShipMetadata) => void }) {
  const bg     = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const meta   = SHIP_TYPES.find(t => t.name === ship.shipType) ?? SHIP_TYPES[0];
  const xpPct  = ((ship.wins ?? 0) / Math.max((ship.level ?? 1) * 5, 5)) * 100;

  return (
    <Box bg={bg} borderRadius="xl" p={5} border="1px" borderColor={border}
      _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s"
    >
      <Flex justify="space-between" align="start" mb={3}>
        <Text fontSize="3xl">{meta.emoji}</Text>
        <Badge colorScheme={meta.color} fontSize="xs">{meta.rarity}</Badge>
      </Flex>
      <Heading size="sm" mb={1}>{ship.name || meta.name}</Heading>
      <Text fontSize="xs" color="gray.500" mb={3}>#{ship.nonce} · Level {ship.level ?? 1} · {meta.size} cells</Text>

      <HStack spacing={2} mb={2}>
        <Text fontSize="xs" color="gray.500">XP</Text>
        <Progress value={Math.min(xpPct, 100)} size="xs" colorScheme="blue" flex={1} borderRadius="full" />
        <Text fontSize="xs">{ship.wins ?? 0} wins</Text>
      </HStack>

      <Divider my={3} />

      <Flex justify="space-between" align="center">
        <VStack spacing={0} align="start">
          <Text fontSize="xs" color="gray.500">Upgrade cost</Text>
          <Text fontSize="sm" fontWeight="bold">{(parseFloat(RARITY_PRICE[meta.rarity]) * (ship.level ?? 1)).toFixed(3)} EGLD</Text>
        </VStack>
        <Button size="sm" colorScheme="blue" onClick={() => onUpgrade(ship)}
          isDisabled={(ship.level ?? 1) >= 10}>
          {(ship.level ?? 1) >= 10 ? '✨ Max' : '⬆ Upgrade'}
        </Button>
      </Flex>
    </Box>
  );
}

function MintCard({ shipType }: { shipType: typeof SHIP_TYPES[0] }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { account } = useGetAccountInfo();
  const toast = useToast();
  const [minting, setMinting] = useState(false);
  const bg     = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');

  async function handleMint() {
    if (!account?.address) return;
    setMinting(true);
    try {
      await mintShip(account.address, shipType.id, `${shipType.name} #${Date.now().toString().slice(-4)}`);
      toast({ title: `${shipType.name} minted!`, status: 'success', duration: 4000 });
      onClose();
    } catch (e: any) {
      toast({ title: 'Mint failed', description: e?.message, status: 'error', duration: 5000 });
    } finally { setMinting(false); }
  }

  return (
    <>
      <Box bg={bg} borderRadius="xl" p={5} border="1px" borderColor={border}
        _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s" cursor="pointer" onClick={onOpen}
      >
        <Flex justify="space-between" align="start" mb={3}>
          <Text fontSize="3xl">{shipType.emoji}</Text>
          <Badge colorScheme={shipType.color} fontSize="xs">{shipType.rarity}</Badge>
        </Flex>
        <Heading size="sm" mb={1}>{shipType.name}</Heading>
        <Text fontSize="xs" color="gray.500" mb={3}>{shipType.size} cells · SFT on MultiversX</Text>
        <Divider my={3} />
        <Flex justify="space-between" align="center">
          <VStack spacing={0} align="start">
            <Text fontSize="xs" color="gray.500">Mint price</Text>
            <Text fontSize="sm" fontWeight="bold">{RARITY_PRICE[shipType.rarity]} EGLD</Text>
          </VStack>
          <Button size="sm" colorScheme={shipType.color}>Mint</Button>
        </Flex>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>{shipType.emoji} Mint {shipType.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text color="gray.500">Rarity</Text>
                <Badge colorScheme={shipType.color}>{shipType.rarity}</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">Size</Text>
                <Text fontWeight="bold">{shipType.size} cells</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">Max level</Text>
                <Text fontWeight="bold">10</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.500">Token type</Text>
                <Text fontWeight="bold">SFT (ESDT)</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between">
                <Text fontWeight="bold">Total cost</Text>
                <Text fontWeight="bold" fontSize="lg" color="blue.400">{RARITY_PRICE[shipType.rarity]} EGLD</Text>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button onClick={onClose} variant="ghost">Cancel</Button>
            <Button colorScheme={shipType.color} isLoading={minting} onClick={handleMint}>
              Confirm Mint
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default function MarketplacePage() {
  const { account } = useGetAccountInfo();
  const toast = useToast();
  const [myShips, setMyShips]       = useState<ShipMetadata[]>([]);
  const [loadingShips, setLoading]  = useState(false);
  const [upgrading, setUpgrading]   = useState(false);
  const [selectedShip, setSelected] = useState<ShipMetadata | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const heroBg = useColorModeValue('purple.700', 'purple.900');

  useEffect(() => {
    if (!account?.address) return;
    setLoading(true);
    getUserShips(account.address)
      .then(setMyShips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [account?.address]);

  function handleUpgrade(ship: ShipMetadata) {
    setSelected(ship);
    onOpen();
  }

  async function confirmUpgrade() {
    if (!selectedShip || !account?.address) return;
    setUpgrading(true);
    try {
      await upgradeShip(account.address, selectedShip.nonce);
      toast({ title: 'Ship upgraded!', status: 'success', duration: 4000 });
      const updated = await getUserShips(account.address);
      setMyShips(updated);
      onClose();
    } catch (e: any) {
      toast({ title: 'Upgrade failed', description: e?.message, status: 'error', duration: 5000 });
    } finally { setUpgrading(false); }
  }

  return (
    <Box>
      <Box bg={heroBg} color="white" py={{ base: 10, md: 16 }} px={4} textAlign="center">
        <Container maxW="container.md">
          <Text fontSize="4xl" mb={2}>⚔️</Text>
          <Heading size={{ base: 'xl', md: '2xl' }} mb={3}>Ship Marketplace</Heading>
          <Text color="whiteAlpha.800" maxW="460px" mx="auto">
            Mint your fleet as SFT tokens on MultiversX. Upgrade ships to increase their power.
          </Text>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <Tabs colorScheme="purple" variant="soft-rounded">
          <TabList mb={6} gap={2}>
            <Tab>🛒 Mint Ships</Tab>
            <Tab>🚢 My Fleet ({myShips.length})</Tab>
          </TabList>
          <TabPanels>
            {/* Mint */}
            <TabPanel px={0}>
              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }} gap={4}>
                {SHIP_TYPES.map(t => <MintCard key={t.id} shipType={t} />)}
              </Grid>
            </TabPanel>

            {/* My Fleet */}
            <TabPanel px={0}>
              {loadingShips ? (
                <Grid templateColumns={{ base: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }} gap={4}>
                  {[1,2,3].map(i => <Skeleton key={i} h="200px" borderRadius="xl" />)}
                </Grid>
              ) : myShips.length === 0 ? (
                <VStack py={16} spacing={3}>
                  <Text fontSize="3xl">⚓</Text>
                  <Heading size="sm" color="gray.500">No ships yet</Heading>
                  <Text color="gray.400" fontSize="sm">Mint your first ship from the Mint tab</Text>
                </VStack>
              ) : (
                <Grid templateColumns={{ base: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }} gap={4}>
                  {myShips.map(s => <ShipCard key={s.nonce} ship={s} onUpgrade={handleUpgrade} />)}
                </Grid>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>

      {/* Upgrade confirmation modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>⬆️ Upgrade Ship</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedShip && (
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text color="gray.500">Ship</Text>
                  <Text fontWeight="bold">{selectedShip.name || selectedShip.shipType}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text color="gray.500">Current level</Text>
                  <Text fontWeight="bold">{selectedShip.level ?? 1}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text color="gray.500">New level</Text>
                  <Badge colorScheme="blue">{(selectedShip.level ?? 1) + 1}</Badge>
                </HStack>
                <Divider />
                <HStack justify="space-between">
                  <Text fontWeight="bold">Cost</Text>
                  <Text fontWeight="bold" color="blue.400">
                    {(parseFloat(RARITY_PRICE[SHIP_TYPES.find(t => t.name === selectedShip.shipType)?.rarity ?? 'Common']) * (selectedShip.level ?? 1)).toFixed(3)} EGLD
                  </Text>
                </HStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" isLoading={upgrading} onClick={confirmUpgrade}>Upgrade</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
