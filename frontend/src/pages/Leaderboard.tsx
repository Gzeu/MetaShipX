import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Grid,
  Avatar, Badge, Flex, Skeleton, Divider,
  Tag, useColorModeValue, Stat, StatLabel, StatNumber,
  Tooltip, Button, Tabs, TabList, Tab, TabPanels, TabPanel,
  IconButton,
} from '@chakra-ui/react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { getTopPlayers, getPlayerRank, getPlayerStats, type LeaderEntry } from '../services/battleship.service';

function shortAddr(a: string) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—'; }
const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { account } = useGetAccountInfo();
  const myAddress   = account?.address ?? '';

  const [players,    setPlayers]    = useState<LeaderEntry[]>([]);
  const [myRank,     setMyRank]     = useState(0);
  const [myStats,    setMyStats]    = useState<{ wins: number; egldEarned: string } | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const bg      = useColorModeValue('white',    'gray.800');
  const statBg  = useColorModeValue('gray.50',  'gray.750');
  const border  = useColorModeValue('gray.200', 'gray.700');
  const heroBg  = useColorModeValue('yellow.400', 'yellow.700');
  const hoverBg = useColorModeValue('gray.50',  'gray.750');
  const meBg    = useColorModeValue('blue.50',  'blue.900');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, rank, stats] = await Promise.all([
        getTopPlayers(50),
        myAddress ? getPlayerRank(myAddress) : Promise.resolve(0),
        myAddress ? getPlayerStats(myAddress) : Promise.resolve(null),
      ]);
      setPlayers(entries);
      setMyRank(rank);
      setMyStats(stats);
      setLastUpdate(new Date());
    } catch {
      // silent — UI shows empty state
    } finally {
      setLoading(false);
    }
  }, [myAddress]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-refresh every 30 s (5 Supernova blocks ~3s each = safe cadence)
  useEffect(() => {
    const timer = setInterval(reload, 30_000);
    return () => clearInterval(timer);
  }, [reload]);

  const totalGames = players.reduce((s, p) => s + p.gamesPlayed, 0);
  const topWins    = players[0]?.wins ?? 0;

  return (
    <Box>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <Box bg={heroBg} color="gray.900" py={{ base: 10, md: 16 }} px={4} textAlign="center">
        <Container maxW="container.md">
          <Text fontSize="4xl" mb={2}>🏆</Text>
          <Heading size={{ base: 'xl', md: '2xl' }} mb={3}>Leaderboard</Heading>
          <Text maxW="460px" mx="auto" opacity={0.75}>
            Top commanders ranked by on-chain victories on the MultiversX seas.
          </Text>
          <HStack justify="center" mt={4} spacing={3} flexWrap="wrap">
            {myRank > 0 && (
              <Badge colorScheme="blue" fontSize="md" px={4} py={1} borderRadius="full">
                Your rank: #{myRank}
              </Badge>
            )}
            {myStats && (
              <Badge colorScheme="green" fontSize="md" px={4} py={1} borderRadius="full">
                {myStats.wins} wins · {myStats.egldEarned} EGLD earned
              </Badge>
            )}
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.lg" py={8}>

        {/* ── Global stats ────────────────────────────────────────── */}
        <Grid templateColumns={{ base: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }} gap={4} mb={8}>
          {[
            { label: 'Ranked Players', value: players.length, icon: '👥' },
            { label: 'Total Games',    value: totalGames,      icon: '🎮' },
            { label: 'Top Wins',       value: topWins,         icon: '🥇' },
            { label: 'Your Rank',      value: myRank > 0 ? `#${myRank}` : myAddress ? 'Unranked' : '—', icon: '📍' },
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

        {/* ── Podium top 3 ────────────────────────────────────────── */}
        {!loading && players.length >= 3 && (
          <Grid templateColumns="1fr 1fr 1fr" gap={4} mb={8}>
            {[players[1], players[0], players[2]].map((p, podIdx) => {
              const heights = ['140px', '180px', '140px'];
              const sizes   = ['lg', '2xl', 'lg'];
              const medals  = [MEDALS[1], MEDALS[0], MEDALS[2]];
              if (!p) return <Box key={podIdx} />;
              const isMe = p.address === myAddress;
              return (
                <Flex key={p.address} direction="column" align="center" justify="flex-end"
                  bg={isMe ? meBg : bg} borderRadius="xl" border="2px"
                  borderColor={isMe ? 'blue.400' : border}
                  h={heights[podIdx]} p={4} transition="all 0.2s" _hover={{ shadow: 'md' }}
                >
                  <Text fontSize="2xl" mb={1}>{medals[podIdx]}</Text>
                  <Avatar size={sizes[podIdx] as any} name={p.address}
                    bg={`hsl(${parseInt(p.address.slice(-4), 16) % 360},60%,55%)`} mb={2}
                  />
                  <Tooltip label={p.address}>
                    <Text fontSize="xs" fontWeight="bold">{shortAddr(p.address)}</Text>
                  </Tooltip>
                  <Text fontSize="xs" color="gray.500">{p.wins} wins</Text>
                  <Text fontSize="xs" color="yellow.400">{parseFloat(p.egldEarned).toFixed(2)} EGLD</Text>
                </Flex>
              );
            })}
          </Grid>
        )}

        {/* ── Full Table ──────────────────────────────────────────── */}
        <Tabs variant="soft-rounded" colorScheme="yellow" mb={4}>
          <HStack justify="space-between" mb={3}>
            <TabList>
              <Tab>🏆 All-Time Top 50</Tab>
              <Tab>⚡ Recent Activity</Tab>
            </TabList>
            <HStack spacing={2}>
              {lastUpdate && (
                <Text fontSize="xs" color="gray.400">
                  Updated {lastUpdate.toLocaleTimeString()}
                </Text>
              )}
              <Button size="xs" variant="ghost" onClick={reload} isLoading={loading}
                title="Refresh leaderboard">
                🔄
              </Button>
            </HStack>
          </HStack>

          <TabPanels>
            {/* All-Time */}
            <TabPanel p={0}>
              <Box bg={bg} borderRadius="xl" border="1px" borderColor={border} overflow="hidden">
                <Grid templateColumns="40px 1fr repeat(5, 90px)" gap={0} px={4} py={3}
                  bg={statBg} borderBottom="1px" borderColor={border}>
                  {['#', 'Player', 'Wins', 'Losses', 'Win %', 'EGLD', 'Games'].map(h => (
                    <Text key={h} fontSize="xs" fontWeight="bold" color="gray.500"
                      textTransform="uppercase" letterSpacing="wide"
                      textAlign={h === 'Player' ? 'left' : 'center'}>{h}</Text>
                  ))}
                </Grid>

                {loading ? (
                  <VStack spacing={0} divider={<Divider />}>
                    {[1,2,3,4,5].map(i => (
                      <Box key={i} w="full" px={4} py={3}><Skeleton h="32px" borderRadius="md" /></Box>
                    ))}
                  </VStack>
                ) : players.length === 0 ? (
                  <VStack py={16} spacing={3}>
                    <Text fontSize="4xl">🌊</Text>
                    <Text color="gray.500" fontWeight="medium">No ranked players yet</Text>
                    <Text fontSize="sm" color="gray.400">Win a game to appear on the leaderboard</Text>
                  </VStack>
                ) : (
                  <VStack spacing={0} divider={<Divider borderColor={border} />}>
                    {players.map((p, i) => {
                      const isMe = p.address === myAddress;
                      const wr   = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
                      return (
                        <Grid key={p.address}
                          templateColumns="40px 1fr repeat(5, 90px)" gap={0}
                          px={4} py={3} w="full" alignItems="center"
                          bg={isMe ? meBg : 'transparent'}
                          _hover={{ bg: isMe ? meBg : hoverBg }}
                          transition="background 0.15s"
                        >
                          <Text fontWeight="bold" fontSize="sm"
                            color={i < 3 ? 'yellow.400' : 'gray.500'}>
                            {i < 3 ? MEDALS[i] : `${i + 1}`}
                          </Text>
                          <HStack spacing={3}>
                            <Avatar size="xs" name={p.address}
                              bg={`hsl(${parseInt(p.address.slice(-4), 16) % 360},60%,55%)`}
                            />
                            <Tooltip label={p.address}>
                              <Text fontSize="sm" fontWeight={isMe ? 'bold' : 'normal'}>
                                {shortAddr(p.address)}{isMe && ' 👈'}
                              </Text>
                            </Tooltip>
                          </HStack>
                          <Text fontSize="sm" fontWeight="bold" color="green.400" textAlign="center">{p.wins}</Text>
                          <Text fontSize="sm" color="red.400"   textAlign="center">{p.losses}</Text>
                          <Text fontSize="sm"                   textAlign="center">{wr}%</Text>
                          <Text fontSize="sm" color="yellow.400" textAlign="center">{parseFloat(p.egldEarned).toFixed(2)}</Text>
                          <Text fontSize="sm" color="gray.400"  textAlign="center">{p.gamesPlayed}</Text>
                        </Grid>
                      );
                    })}
                  </VStack>
                )}
              </Box>
            </TabPanel>

            {/* Recent Activity */}
            <TabPanel p={0}>
              <Box bg={bg} borderRadius="xl" border="1px" borderColor={border} p={8}>
                <VStack spacing={3}>
                  <Text fontSize="3xl">⚡</Text>
                  <Text fontWeight="medium">Recent Activity Feed</Text>
                  <Text fontSize="sm" color="gray.400" textAlign="center">
                    Coming in v0.8.0 — live game events streamed via WebSocket.
                  </Text>
                </VStack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

      </Container>
    </Box>
  );
}
