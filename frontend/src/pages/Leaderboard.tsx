import React, { useEffect, useState } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Grid,
  Avatar, Badge, Flex, Skeleton, Divider, Tabs, TabList,
  Tab, TabPanel, TabPanels, Tag, useColorModeValue, Stat,
  StatLabel, StatNumber, Tooltip,
} from '@chakra-ui/react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { getTopPlayers } from '../services/battleship.service';

function shortAddr(a: string) { return a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—'; }

const MEDALS = ['🥇','🥈','🥉'];

interface Player {
  address: string;
  wins: number;
  losses: number;
  egldEarned: string;
  gamesPlayed: number;
}

export default function LeaderboardPage() {
  const { account } = useGetAccountInfo();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const bg     = useColorModeValue('white', 'gray.800');
  const statBg = useColorModeValue('gray.50', 'gray.750');
  const border = useColorModeValue('gray.200', 'gray.700');
  const heroBg = useColorModeValue('yellow.400', 'yellow.700');

  useEffect(() => {
    getTopPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  const myRank = players.findIndex(p => p.address === account?.address) + 1;
  const topWins = players[0]?.wins ?? 1;

  return (
    <Box>
      {/* Hero */}
      <Box bg={heroBg} color="gray.900" py={{ base: 10, md: 16 }} px={4} textAlign="center">
        <Container maxW="container.md">
          <Text fontSize="4xl" mb={2}>🏆</Text>
          <Heading size={{ base: 'xl', md: '2xl' }} mb={3}>Leaderboard</Heading>
          <Text maxW="460px" mx="auto" opacity={0.75}>
            Top commanders ranked by victories on the MultiversX seas.
          </Text>
          {myRank > 0 && (
            <Badge mt={4} colorScheme="blue" fontSize="md" px={4} py={1} borderRadius="full">
              Your rank: #{myRank}
            </Badge>
          )}
        </Container>
      </Box>

      <Container maxW="container.lg" py={8}>
        {/* Global stats */}
        <Grid templateColumns={{ base: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }} gap={4} mb={8}>
          {[
            { label: 'Total Players', value: players.length,           icon: '👥' },
            { label: 'Total Games',   value: players.reduce((s,p) => s + p.gamesPlayed, 0), icon: '🎮' },
            { label: 'Top Wins',      value: players[0]?.wins ?? 0,    icon: '🥇' },
            { label: 'Your Rank',     value: myRank > 0 ? `#${myRank}` : '—', icon: '📍' },
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

        {/* Top 3 podium */}
        {!loading && players.length >= 3 && (
          <Grid templateColumns="1fr 1fr 1fr" gap={4} mb={8}>
            {[players[1], players[0], players[2]].map((p, podIdx) => {
              const rank = podIdx === 0 ? 2 : podIdx === 1 ? 1 : 3;
              const sizes = ['lg', '2xl', 'lg'];
              const heights = ['140px', '180px', '140px'];
              const medals = [MEDALS[1], MEDALS[0], MEDALS[2]];
              if (!p) return <Box key={podIdx} />;
              return (
                <Flex key={p.address} direction="column" align="center" justify="flex-end"
                  bg={bg} borderRadius="xl" border="1px" borderColor={border}
                  h={heights[podIdx]} p={4} transition="all 0.2s"
                  _hover={{ shadow: 'md' }}
                >
                  <Text fontSize="2xl" mb={1}>{medals[podIdx]}</Text>
                  <Avatar
                    size={sizes[podIdx] as any}
                    name={p.address}
                    bg={`hsl(${parseInt(p.address.slice(-4),16) % 360},60%,55%)`}
                    mb={2}
                  />
                  <Text fontSize="xs" fontWeight="bold">{shortAddr(p.address)}</Text>
                  <Text fontSize="xs" color="gray.500">{p.wins} wins</Text>
                </Flex>
              );
            })}
          </Grid>
        )}

        {/* Full list */}
        <Box bg={bg} borderRadius="xl" border="1px" borderColor={border} overflow="hidden">
          {/* Header */}
          <Grid templateColumns="40px 1fr repeat(4, 90px)" gap={0} px={4} py={3}
            bg={statBg} borderBottom="1px" borderColor={border}
          >
            {['#','Player','Wins','Losses','Win Rate','EGLD'].map(h => (
              <Text key={h} fontSize="xs" fontWeight="bold" color="gray.500"
                textTransform="uppercase" letterSpacing="wide" textAlign={h==='Player'?'left':'center'}>
                {h}
              </Text>
            ))}
          </Grid>

          {loading ? (
            <VStack spacing={0} divider={<Divider />}>
              {[1,2,3,4,5].map(i => (
                <Box key={i} w="full" px={4} py={3}>
                  <Skeleton h="32px" borderRadius="md" />
                </Box>
              ))}
            </VStack>
          ) : players.length === 0 ? (
            <VStack py={12} spacing={2}>
              <Text fontSize="3xl">🌊</Text>
              <Text color="gray.500">No players yet</Text>
            </VStack>
          ) : (
            <VStack spacing={0} divider={<Divider borderColor={border} />}>
              {players.map((p, i) => {
                const isMe = p.address === account?.address;
                const wr = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
                return (
                  <Grid key={p.address}
                    templateColumns="40px 1fr repeat(4, 90px)" gap={0}
                    px={4} py={3} w="full" align="center"
                    bg={isMe ? useColorModeValue('blue.50','blue.900') : 'transparent'}
                    _hover={{ bg: useColorModeValue('gray.50','gray.750') }}
                  >
                    <Text fontWeight="bold" fontSize="sm" color={i < 3 ? 'yellow.500' : 'gray.500'}>
                      {i < 3 ? MEDALS[i] : `${i+1}`}
                    </Text>
                    <HStack spacing={3}>
                      <Avatar size="xs" name={p.address}
                        bg={`hsl(${parseInt(p.address.slice(-4),16) % 360},60%,55%)`}
                      />
                      <Tooltip label={p.address}>
                        <Text fontSize="sm" fontWeight={isMe ? 'bold' : 'normal'}>
                          {shortAddr(p.address)}{isMe && ' (you)'}
                        </Text>
                      </Tooltip>
                    </HStack>
                    <Text fontSize="sm" fontWeight="bold" color="green.400" textAlign="center">{p.wins}</Text>
                    <Text fontSize="sm" color="red.400" textAlign="center">{p.losses}</Text>
                    <Text fontSize="sm" textAlign="center">{wr}%</Text>
                    <Text fontSize="sm" color="yellow.400" textAlign="center">{parseFloat(p.egldEarned).toFixed(2)}</Text>
                  </Grid>
                );
              })}
            </VStack>
          )}
        </Box>
      </Container>
    </Box>
  );
}
