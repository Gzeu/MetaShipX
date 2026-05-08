import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Grid,
  Avatar, Badge, Divider, Flex, Stat, StatLabel, StatNumber,
  Skeleton, Tabs, TabList, Tab, TabPanel, TabPanels,
  useColorModeValue, Progress, Tag, Wrap, WrapItem,
} from '@chakra-ui/react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { getUserShips, ShipMetadata } from '../services/nft.service';
import { getPlayerGames } from '../services/battleship.service';

const SHIP_EMOJIS: Record<string, string> = {
  Destroyer: '🚤', Submarine: '🤿', Cruiser: '⚓', Battleship: '🛳', Carrier: '✈️',
};

function shortAddr(a: string) { return a ? `${a.slice(0,6)}…${a.slice(-4)}` : ''; }

export default function ProfilePage() {
  const { account } = useGetAccountInfo();
  const [ships, setShips]       = useState<ShipMetadata[]>([]);
  const [games, setGames]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const bg     = useColorModeValue('white', 'gray.800');
  const statBg = useColorModeValue('gray.50', 'gray.750');
  const border = useColorModeValue('gray.200', 'gray.700');
  const heroBg = useColorModeValue('gray.800', 'gray.900');

  useEffect(() => {
    if (!account?.address) return;
    Promise.all([
      getUserShips(account.address),
      getPlayerGames(account.address),
    ])
      .then(([s, g]) => { setShips(s); setGames(g); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [account?.address]);

  const wins   = games.filter(g => g.winner === account?.address).length;
  const losses = games.filter(g => g.winner && g.winner !== account?.address).length;
  const total  = games.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const egldEarned = games.reduce((s, g) => s + parseFloat(g.prize ?? '0'), 0);

  return (
    <Box>
      {/* Hero / Profile header */}
      <Box bg={heroBg} color="white" py={{ base: 10, md: 14 }} px={4}>
        <Container maxW="container.lg">
          <Flex align="center" gap={6} flexDir={{ base: 'column', md: 'row' }}>
            <Avatar
              size="2xl"
              name={account?.address ?? 'Player'}
              bg={account?.address ? `hsl(${parseInt(account.address.slice(-4), 16) % 360},60%,55%)` : 'blue.500'}
            />
            <Box textAlign={{ base: 'center', md: 'left' }}>
              <Heading size={{ base: 'lg', md: 'xl' }} mb={1}>
                {shortAddr(account?.address ?? '')}
              </Heading>
              <Text color="whiteAlpha.600" fontSize="sm" mb={3}>{account?.address}</Text>
              <Wrap>
                <WrapItem><Badge colorScheme="blue">Level {Math.floor(wins / 5) + 1}</Badge></WrapItem>
                <WrapItem><Badge colorScheme="green">{wins} Wins</Badge></WrapItem>
                <WrapItem><Badge colorScheme="purple">{ships.length} Ships</Badge></WrapItem>
              </Wrap>
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.lg" py={8}>
        {/* Stats row */}
        <Grid templateColumns={{ base: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }} gap={4} mb={8}>
          {[
            { label: 'Games Played', value: total,                icon: '🎮' },
            { label: 'Wins',         value: wins,                 icon: '🏆' },
            { label: 'Win Rate',     value: `${winRate}%`,        icon: '📈' },
            { label: 'EGLD Earned',  value: `${egldEarned.toFixed(2)}`, icon: '💰' },
          ].map(s => (
            <Skeleton key={s.label} isLoaded={!loading} borderRadius="xl">
              <Box bg={statBg} borderRadius="xl" p={5} border="1px" borderColor={border}>
                <Text fontSize="xl" mb={1}>{s.icon}</Text>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">{s.label}</Text>
                <Text fontSize="xl" fontWeight="bold" mt={1}>{s.value}</Text>
              </Box>
            </Skeleton>
          ))}
        </Grid>

        <Tabs colorScheme="blue" variant="soft-rounded">
          <TabList mb={6} gap={2}>
            <Tab>🚢 Fleet ({ships.length})</Tab>
            <Tab>🎮 Match History ({total})</Tab>
          </TabList>
          <TabPanels>
            {/* Fleet */}
            <TabPanel px={0}>
              {loading ? (
                <Grid templateColumns={{ base: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }} gap={4}>
                  {[1,2,3].map(i => <Skeleton key={i} h="120px" borderRadius="xl" />)}
                </Grid>
              ) : ships.length === 0 ? (
                <VStack py={12} spacing={2}>
                  <Text fontSize="3xl">⚓</Text>
                  <Text color="gray.500">No ships. Mint some in the Marketplace!</Text>
                </VStack>
              ) : (
                <Grid templateColumns={{ base: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }} gap={4}>
                  {ships.map(ship => (
                    <Box key={ship.nonce} bg={bg} borderRadius="xl" p={4} border="1px" borderColor={border}>
                      <Flex justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Text fontSize="2xl">{SHIP_EMOJIS[ship.shipType] ?? '🚢'}</Text>
                          <Box>
                            <Text fontWeight="semibold" fontSize="sm">{ship.name || ship.shipType}</Text>
                            <Text fontSize="xs" color="gray.500">Level {ship.level ?? 1} · #{ship.nonce}</Text>
                          </Box>
                        </HStack>
                        <Badge colorScheme="blue">Lv {ship.level ?? 1}</Badge>
                      </Flex>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500">Wins</Text>
                        <Progress
                          value={Math.min(((ship.wins ?? 0) / Math.max((ship.level ?? 1) * 5, 5)) * 100, 100)}
                          size="xs" colorScheme="green" flex={1} borderRadius="full"
                        />
                        <Text fontSize="xs">{ship.wins ?? 0}</Text>
                      </HStack>
                    </Box>
                  ))}
                </Grid>
              )}
            </TabPanel>

            {/* Match History */}
            <TabPanel px={0}>
              {loading ? (
                <VStack spacing={3}>
                  {[1,2,3].map(i => <Skeleton key={i} h="60px" w="full" borderRadius="xl" />)}
                </VStack>
              ) : games.length === 0 ? (
                <VStack py={12} spacing={2}>
                  <Text fontSize="3xl">🎮</Text>
                  <Text color="gray.500">No games yet. Join the Lobby!</Text>
                </VStack>
              ) : (
                <VStack spacing={3}>
                  {games.map((game, i) => {
                    const isWin = game.winner === account?.address;
                    return (
                      <Box key={game.id ?? i} bg={bg} borderRadius="xl" p={4}
                        border="1px" borderColor={isWin ? 'green.400' : border} w="full"
                      >
                        <Flex justify="space-between" align="center">
                          <HStack spacing={3}>
                            <Badge colorScheme={isWin ? 'green' : 'red'} fontSize="xs">
                              {isWin ? 'WIN' : game.winner ? 'LOSS' : 'IN PROGRESS'}
                            </Badge>
                            <Text fontSize="sm" fontWeight="semibold">Game #{game.id ?? i + 1}</Text>
                          </HStack>
                          <HStack spacing={3}>
                            {game.prize && <Tag colorScheme="yellow" size="sm">{game.prize} EGLD</Tag>}
                            <Text fontSize="xs" color="gray.500">
                              vs {shortAddr(game.opponent ?? game.player2 ?? '')}
                            </Text>
                          </HStack>
                        </Flex>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
}
