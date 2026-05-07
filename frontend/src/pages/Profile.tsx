import {
  Box, Container, VStack, HStack, Heading, Text, Button,
  SimpleGrid, Flex, Badge, Avatar, Divider, Spinner,
  Stat, StatLabel, StatNumber, StatHelpText,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Progress, CircularProgress, CircularProgressLabel,
  Tooltip, useColorModeValue, Alert, AlertIcon,
  Tag, TagLabel,
} from '@chakra-ui/react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';

const SHIP_TYPES = [
  { id: 0, name: 'Destroyer', emoji: '🚤', color: 'gray' },
  { id: 1, name: 'Submarine', emoji: '🦟', color: 'blue' },
  { id: 2, name: 'Cruiser', emoji: '⛵', color: 'cyan' },
  { id: 3, name: 'Battleship', emoji: '🛳️', color: 'purple' },
  { id: 4, name: 'Carrier', emoji: '✈️', color: 'yellow' },
];

const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🎖️', title: 'Prima Victorie', desc: 'Câștigă primul meci', req: (s: any) => s.wins >= 1 },
  { id: 'ten_wins', icon: '🏆', title: 'Veteran', desc: '10 victorii', req: (s: any) => s.wins >= 10 },
  { id: 'streak_3', icon: '🔥', title: 'Pe Foc', desc: '3 victorii consecutive', req: (s: any) => s.bestWinStreak >= 3 },
  { id: 'sharpshooter', icon: '🎯', title: 'Lunetist', desc: 'Acuratețe > 70%', req: (s: any) => s.accuracy >= 70 },
  { id: 'big_bet', icon: '💰', title: 'All-In', desc: 'Câștigă un meci cu pariu ≥ 1 EGLD', req: (s: any) => parseFloat(s.totalEgldWon) >= 1 },
  { id: 'perfect', icon: '⭐', title: 'Flawless', desc: 'Câștigă fără a pierde nicio navă', req: (_: any, matches: any[]) => matches.some(m => m.result === 'win' && m.shipsLost === 0) },
  { id: 'collector', icon: '⚓', title: 'Colecționar', desc: 'Deține 3+ nave NFT', req: (_: any, __: any, ships: any[]) => ships.length >= 3 },
  { id: 'staker', icon: '💎', title: 'Diamond Hands', desc: 'Stakeaza EGLD', req: (_: any, __: any, ___: any, stake: any) => stake && parseFloat(stake.amount || '0') > 0 },
];

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m fa`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h fa`;
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

function shortenAddr(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function ProfilePage() {
  const { address } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();
  const navigate = useNavigate();
  const { matches, stats, ships, stakeInfo, isLoading } = useProfile();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const tableBg = useColorModeValue('gray.50', 'gray.900');

  if (!isLoggedIn) {
    return (
      <Container maxW="container.md" py={20}>
        <VStack spacing={6} textAlign="center">
          <Text fontSize="5xl">🔐</Text>
          <Heading size="lg" color="gray.400">Conectează-te pentru a vedea profilul</Heading>
          <Button colorScheme="blue" size="lg" onClick={() => navigate('/')}>
            ← Înapoi Acasă
          </Button>
        </VStack>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.400" thickness="4px" />
          <Text color="gray.500">Se încarcă profilul...</Text>
        </VStack>
      </Flex>
    );
  }

  const rank = !stats ? '—' : stats.winRate >= 80 ? 'Admiral' : stats.winRate >= 60 ? 'Căpitan' : stats.winRate >= 40 ? 'Locotenent' : 'Recrut';
  const rankColor = rank === 'Admiral' ? 'yellow' : rank === 'Căpitan' ? 'purple' : rank === 'Locotenent' ? 'blue' : 'gray';

  const unlockedAchievements = ACHIEVEMENTS.filter(a => {
    try { return a.req(stats, matches, ships, stakeInfo); } catch { return false; }
  });

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">

        {/* PROFILE HEADER */}
        <Box p={8} borderRadius="2xl" bg={cardBg} border="1px" borderColor={borderColor} shadow="md">
          <Flex gap={6} flexWrap="wrap" align="center">
            <Avatar
              size="2xl"
              name={address}
              bg="blue.600"
              color="white"
              fontSize="3xl"
            />
            <VStack align="start" spacing={2} flex={1}>
              <HStack flexWrap="wrap" gap={2}>
                <Heading size="lg" color={useColorModeValue('gray.800', 'white')}>
                  {address.slice(0, 10)}...{address.slice(-8)}
                </Heading>
                <Badge colorScheme={rankColor} fontSize="md" px={3} py={1} borderRadius="full">
                  ⚓ {rank}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="gray.500" fontFamily="mono">{address}</Text>
              <HStack flexWrap="wrap" gap={2} mt={1}>
                <Tag colorScheme="blue" size="sm"><TagLabel>{ships.length} nave</TagLabel></Tag>
                <Tag colorScheme="green" size="sm"><TagLabel>{stats?.totalGames || 0} meciuri</TagLabel></Tag>
                <Tag colorScheme="purple" size="sm"><TagLabel>{unlockedAchievements.length}/{ACHIEVEMENTS.length} achievem.</TagLabel></Tag>
                {stakeInfo && parseFloat(stakeInfo.amount || '0') > 0 && (
                  <Tag colorScheme="yellow" size="sm"><TagLabel>💎 Staker</TagLabel></Tag>
                )}
              </HStack>
            </VStack>
            <VStack spacing={2} align={{ base: 'start', md: 'end' }}>
              <Button colorScheme="blue" size="sm" onClick={() => navigate('/game')}>⚔️ Joacă</Button>
              <Button variant="outline" colorScheme="purple" size="sm" onClick={() => navigate('/marketplace')}>⚓ Nave</Button>
            </VStack>
          </Flex>
        </Box>

        {/* STATS GRID */}
        {stats && (
          <SimpleGrid columns={{ base: 2, sm: 3, lg: 6 }} spacing={4}>
            {[
              { label: 'Total Meciuri', value: stats.totalGames, color: 'white' },
              { label: 'Victorii', value: stats.wins, color: 'green.300' },
              { label: 'Înfrângeri', value: stats.losses, color: 'red.300' },
              { label: 'EGLD Câștigat', value: `+${stats.totalEgldWon}`, color: 'yellow.300' },
              { label: 'Streak Max', value: stats.bestWinStreak, color: 'orange.300' },
              { label: 'Acuratețe', value: `${stats.accuracy}%`, color: 'cyan.300' },
            ].map(s => (
              <Box key={s.label} p={4} borderRadius="xl" bg={cardBg} border="1px" borderColor={borderColor} textAlign="center">
                <Text fontSize="2xl" fontWeight={800} color={s.color}>{s.value}</Text>
                <Text fontSize="xs" color="gray.500" mt={1}>{s.label}</Text>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* WIN RATE + ACCURACY RINGS */}
        {stats && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box p={6} borderRadius="2xl" bg={cardBg} border="1px" borderColor={borderColor}>
              <Flex align="center" gap={6}>
                <CircularProgress value={stats.winRate} color="green.400" size="100px" thickness="10px" trackColor={useColorModeValue('gray.200', 'gray.700')}>
                  <CircularProgressLabel>
                    <VStack spacing={0}>
                      <Text fontWeight={800} fontSize="xl" color="green.400">{stats.winRate}%</Text>
                      <Text fontSize="9px" color="gray.500">WIN</Text>
                    </VStack>
                  </CircularProgressLabel>
                </CircularProgress>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Win Rate</Text>
                  <Text color="gray.500" fontSize="sm">{stats.wins}V / {stats.losses}Î din {stats.totalGames} meciuri</Text>
                  <Progress value={stats.winRate} colorScheme="green" borderRadius="full" size="xs" w="140px" />
                  <Text fontSize="xs" color="gray.500">Streak curent: {stats.currentStreak} 🔥</Text>
                </VStack>
              </Flex>
            </Box>

            <Box p={6} borderRadius="2xl" bg={cardBg} border="1px" borderColor={borderColor}>
              <Flex align="center" gap={6}>
                <CircularProgress value={stats.accuracy} color="cyan.400" size="100px" thickness="10px" trackColor={useColorModeValue('gray.200', 'gray.700')}>
                  <CircularProgressLabel>
                    <VStack spacing={0}>
                      <Text fontWeight={800} fontSize="xl" color="cyan.400">{stats.accuracy}%</Text>
                      <Text fontSize="9px" color="gray.500">ACC</Text>
                    </VStack>
                  </CircularProgressLabel>
                </CircularProgress>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Acuratețe Foc</Text>
                  <Text color="gray.500" fontSize="sm">{stats.totalShots} lovituri totale</Text>
                  <Progress value={stats.accuracy} colorScheme="cyan" borderRadius="full" size="xs" w="140px" />
                  <Text fontSize="xs" color="gray.500">Durată medie: {formatDuration(stats.avgGameDuration)}</Text>
                </VStack>
              </Flex>
            </Box>
          </SimpleGrid>
        )}

        {/* TABS: Matches / Ships / Achievements */}
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>⚔️ Istoric Meciuri {matches.length ? `(${matches.length})` : ''}</Tab>
            <Tab>⚓ Flota Mea {ships.length ? `(${ships.length})` : ''}</Tab>
            <Tab>🏅 Achievements {unlockedAchievements.length ? `(${unlockedAchievements.length})` : ''}</Tab>
          </TabList>

          <TabPanels>
            {/* MATCH HISTORY */}
            <TabPanel px={0}>
              {matches.length === 0 ? (
                <VStack py={12} spacing={3}>
                  <Text fontSize="3xl">⚔️</Text>
                  <Text color="gray.500">Niciun meci jucat încă.</Text>
                  <Button colorScheme="blue" onClick={() => navigate('/game')}>Joacă primul meci</Button>
                </VStack>
              ) : (
                <TableContainer borderRadius="xl" border="1px" borderColor={borderColor} overflow="hidden">
                  <Table variant="simple" size="sm">
                    <Thead bg={tableBg}>
                      <Tr>
                        <Th>Rezultat</Th>
                        <Th>Adversar</Th>
                        <Th isNumeric>Pariu</Th>
                        <Th isNumeric>Lovituri</Th>
                        <Th isNumeric>Acur.</Th>
                        <Th isNumeric>Durată</Th>
                        <Th>Data</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {matches.map(m => {
                        const acc = m.shotsHit + m.shotsMissed > 0
                          ? Math.round((m.shotsHit / (m.shotsHit + m.shotsMissed)) * 100)
                          : 0;
                        return (
                          <Tr
                            key={m.gameId}
                            _hover={{ bg: useColorModeValue('gray.50', 'gray.750') }}
                            borderLeft="3px solid"
                            borderLeftColor={m.result === 'win' ? 'green.400' : 'red.400'}
                          >
                            <Td>
                              <Badge
                                colorScheme={m.result === 'win' ? 'green' : 'red'}
                                variant="solid" borderRadius="full" px={3}
                              >
                                {m.result === 'win' ? '✓ VICTORIE' : '✗ ÎNFRÂNGERE'}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontSize="sm" fontFamily="mono" color="gray.400">
                                {shortenAddr(m.opponent)}
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text
                                fontWeight="bold"
                                color={m.result === 'win' ? 'green.400' : 'red.400'}
                              >
                                {m.result === 'win' ? '+' : '-'}{m.betAmount} EGLD
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text fontSize="sm">
                                <Text as="span" color="green.400">{m.shotsHit}</Text>
                                <Text as="span" color="gray.500">/{m.shotsHit + m.shotsMissed}</Text>
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Badge colorScheme={acc >= 60 ? 'cyan' : acc >= 40 ? 'yellow' : 'gray'}>
                                {acc}%
                              </Badge>
                            </Td>
                            <Td isNumeric>
                              <Text fontSize="sm" color="gray.400">{formatDuration(m.duration)}</Text>
                            </Td>
                            <Td>
                              <Tooltip label={new Date(m.timestamp).toLocaleString('ro-RO')}>
                                <Text fontSize="sm" color="gray.500" cursor="default">
                                  {formatTimestamp(m.timestamp)}
                                </Text>
                              </Tooltip>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* SHIPS FLEET */}
            <TabPanel px={0}>
              {ships.length === 0 ? (
                <VStack py={12} spacing={3}>
                  <Text fontSize="3xl">⚓</Text>
                  <Text color="gray.500">Flota ta este goală.</Text>
                  <Button colorScheme="purple" onClick={() => navigate('/marketplace')}>Mintează prima navă</Button>
                </VStack>
              ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
                  {ships.map((ship: any) => {
                    const type = SHIP_TYPES[ship.shipType] || SHIP_TYPES[0];
                    return (
                      <Box
                        key={ship.nonce}
                        p={5} borderRadius="xl" bg={cardBg} border="1px" borderColor={borderColor}
                        _hover={{ borderColor: `${type.color}.500`, shadow: 'md' }}
                        transition="all 0.2s"
                      >
                        <HStack spacing={4} mb={3}>
                          <Flex
                            w={12} h={12} borderRadius="xl" fontSize="2xl"
                            justify="center" align="center"
                            bg={`${type.color}.900`}
                          >
                            {type.emoji}
                          </Flex>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">{ship.name}</Text>
                            <HStack spacing={2}>
                              <Badge colorScheme={type.color}>{type.name}</Badge>
                              <Badge colorScheme="yellow">Lv.{ship.level}</Badge>
                            </HStack>
                          </VStack>
                        </HStack>
                        <Divider mb={3} />
                        <SimpleGrid columns={3} spacing={2} textAlign="center">
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" color="yellow.300">{ship.wins}</Text>
                            <Text fontSize="xs" color="gray.500">Victorii</Text>
                          </Box>
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" color="cyan.300">{ship.level}/10</Text>
                            <Text fontSize="xs" color="gray.500">Level</Text>
                          </Box>
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" color="purple.300">#{ship.nonce}</Text>
                            <Text fontSize="xs" color="gray.500">Nonce</Text>
                          </Box>
                        </SimpleGrid>
                        <Progress value={ship.level * 10} colorScheme="cyan" borderRadius="full" size="xs" mt={3} />
                      </Box>
                    );
                  })}
                </SimpleGrid>
              )}
            </TabPanel>

            {/* ACHIEVEMENTS */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} spacing={4}>
                {ACHIEVEMENTS.map(a => {
                  let unlocked = false;
                  try { unlocked = a.req(stats, matches, ships, stakeInfo); } catch {}
                  return (
                    <Box
                      key={a.id}
                      p={5} borderRadius="xl"
                      bg={unlocked ? cardBg : useColorModeValue('gray.100', 'gray.850')}
                      border="1px"
                      borderColor={unlocked ? 'yellow.500' : borderColor}
                      opacity={unlocked ? 1 : 0.45}
                      textAlign="center"
                      transition="all 0.2s"
                      _hover={unlocked ? { shadow: 'md', transform: 'translateY(-2px)' } : {}}
                    >
                      <Text fontSize="3xl" mb={2}
                        filter={unlocked ? 'none' : 'grayscale(1)'}
                      >
                        {a.icon}
                      </Text>
                      <Text fontWeight="bold" fontSize="sm" mb={1}>{a.title}</Text>
                      <Text fontSize="xs" color="gray.500">{a.desc}</Text>
                      {unlocked && (
                        <Badge colorScheme="yellow" mt={2} variant="subtle" borderRadius="full">
                          ✓ Deblocat
                        </Badge>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>

      </VStack>
    </Container>
  );
}
