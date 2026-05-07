import React, { useMemo } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Tabs, TabList, Tab,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Skeleton, Alert, AlertIcon,
  Avatar, Flex, Stat, StatLabel, StatNumber, StatHelpText, Icon,
  Button, Tooltip, Divider, useColorModeValue,
} from '@chakra-ui/react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { LeaderboardCategory, LeaderboardEntry } from '../services/leaderboard.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'acum';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

const RANK_META: Record<number, { emoji: string; color: string; label: string }> = {
  1: { emoji: '🥇', color: 'yellow.400', label: 'Aur' },
  2: { emoji: '🥈', color: 'gray.400',   label: 'Argint' },
  3: { emoji: '🥉', color: 'orange.400', label: 'Bronz' },
};

const CATEGORIES: { id: LeaderboardCategory; label: string; icon: string; desc: string }[] = [
  { id: 'winRate',    label: 'Win Rate',     icon: '📈', desc: 'Procentul victoriilor din total meciuri' },
  { id: 'wins',       label: 'Victorii',     icon: '⚔️',  desc: 'Numărul total de meciuri câștigate' },
  { id: 'egldEarned', label: 'EGLD Câștigat', icon: '💎', desc: 'EGLD net câștigat din meciuri' },
  { id: 'streak',     label: 'Best Streak',  icon: '🔥', desc: 'Cea mai lungă serie de victorii consecutive' },
  { id: 'accuracy',   label: 'Acuratețe',   icon: '🎯', desc: 'Procentul loviturilor din total atacuri' },
];

function RankBadge({ rank }: { rank: number }) {
  const meta = RANK_META[rank];
  if (meta) {
    return (
      <Text fontSize="xl" title={meta.label}>
        {meta.emoji}
      </Text>
    );
  }
  return (
    <Text fontWeight="bold" color="gray.500" fontSize="sm" minW="20px" textAlign="center">
      #{rank}
    </Text>
  );
}

function WinRateBar({ value }: { value: number }) {
  const bg = useColorModeValue('gray.100', 'gray.700');
  const fill = value >= 80 ? 'green.400' : value >= 60 ? 'teal.400' : 'orange.400';
  return (
    <Box w="80px" h="6px" bg={bg} borderRadius="full" overflow="hidden">
      <Box h="100%" w={`${value}%`} bg={fill} borderRadius="full" transition="width 0.5s ease" />
    </Box>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  const bg = useColorModeValue('white', 'gray.800');
  return (
    <Box bg={bg} borderRadius="xl" p={4} shadow="sm" flex="1" minW="140px">
      <Stat>
        <StatLabel color="gray.500" fontSize="xs">{icon} {label}</StatLabel>
        <StatNumber fontSize="xl" fontWeight="bold">{value}</StatNumber>
        {sub && <StatHelpText mb={0}>{sub}</StatHelpText>}
      </Stat>
    </Box>
  );
}

function PlayerRow({
  entry, isMe, category,
}: { entry: LeaderboardEntry; isMe: boolean; category: LeaderboardCategory }) {
  const bg = useColorModeValue(
    isMe ? 'teal.50' : 'white',
    isMe ? 'teal.900' : 'gray.800'
  );
  const borderColor = isMe ? 'teal.400' : 'transparent';

  const primaryValue = useMemo(() => {
    switch (category) {
      case 'winRate':    return `${entry.winRate.toFixed(1)}%`;
      case 'wins':       return String(entry.wins);
      case 'egldEarned': return `${entry.egldEarned} EGLD`;
      case 'streak':     return `${entry.bestStreak} 🔥`;
      case 'accuracy':   return `${entry.accuracy.toFixed(1)}%`;
    }
  }, [entry, category]);

  return (
    <Tr bg={bg} borderLeft={isMe ? '3px solid' : '3px solid transparent'} borderColor={borderColor}>
      <Td py={3}>
        <RankBadge rank={entry.rank} />
      </Td>
      <Td py={3}>
        <HStack spacing={2}>
          <Avatar size="xs" name={entry.address} bg={`hsl(${parseInt(entry.address.slice(-4), 16) % 360}, 60%, 55%)`} />
          <VStack spacing={0} align="flex-start">
            <Text fontWeight={isMe ? 'bold' : 'medium'} fontSize="sm">
              {shortAddr(entry.address)}
              {isMe && <Badge ml={2} colorScheme="teal" fontSize="9px">Tu</Badge>}
            </Text>
            <Text fontSize="10px" color="gray.500">{relativeTime(entry.lastActive)} activ</Text>
          </VStack>
        </HStack>
      </Td>
      <Td py={3} isNumeric>
        <Text fontWeight="bold" color="teal.500" fontSize="sm">{primaryValue}</Text>
      </Td>
      <Td py={3} isNumeric display={{ base: 'none', md: 'table-cell' }}>
        <HStack spacing={1} justify="flex-end">
          <Text fontSize="sm" color="green.500">{entry.wins}V</Text>
          <Text fontSize="sm" color="gray.400">/</Text>
          <Text fontSize="sm" color="red.400">{entry.losses}Î</Text>
        </HStack>
      </Td>
      <Td py={3} display={{ base: 'none', lg: 'table-cell' }}>
        <HStack spacing={2}>
          <WinRateBar value={entry.winRate} />
          <Text fontSize="xs" color="gray.500">{entry.winRate.toFixed(0)}%</Text>
        </HStack>
      </Td>
      <Td py={3} isNumeric display={{ base: 'none', lg: 'table-cell' }}>
        <Text fontSize="sm">{entry.accuracy.toFixed(1)}%</Text>
      </Td>
      <Td py={3} isNumeric display={{ base: 'none', md: 'table-cell' }}>
        <Text fontSize="sm">{entry.egldEarned} EGLD</Text>
      </Td>
    </Tr>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { account } = useGetAccountInfo();
  const playerAddress = account?.address;

  const {
    entries, total, hasMore, loading, error,
    category, page,
    setCategory, setPage, refresh,
    playerRank,
  } = useLeaderboard(playerAddress);

  const headerBg = useColorModeValue('navy.900', 'gray.900');
  const tableBg  = useColorModeValue('white', 'gray.800');

  const categoryIdx = CATEGORIES.findIndex(c => c.id === category);

  // Aggregate stats from loaded entries
  const totalGames = useMemo(() => entries.reduce((s, e) => s + e.totalGames, 0), [entries]);
  const topWinRate = useMemo(() => entries.length ? Math.max(...entries.map(e => e.winRate)) : 0, [entries]);
  const topEgld    = useMemo(() => entries.length ? Math.max(...entries.map(e => parseFloat(e.egldEarned))) : 0, [entries]);
  const topStreak  = useMemo(() => entries.length ? Math.max(...entries.map(e => e.bestStreak)) : 0, [entries]);

  return (
    <Box>
      {/* ── Hero banner ── */}
      <Box
        bgGradient="linear(to-br, navy.900, teal.900, gray.900)"
        color="white"
        py={{ base: 10, md: 16 }}
        px={4}
        textAlign="center"
        position="relative"
        overflow="hidden"
      >
        {/* decorative grid */}
        <Box
          position="absolute" inset={0} opacity={0.06}
          backgroundImage="repeating-linear-gradient(0deg,white 0,white 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,white 0,white 1px,transparent 1px,transparent 40px)"
          pointerEvents="none"
        />
        <Container maxW="container.lg" position="relative">
          <Text fontSize="4xl" mb={2}>🏆</Text>
          <Heading size={{ base: 'xl', md: '2xl' }} mb={3} letterSpacing="tight">
            Leaderboard Global
          </Heading>
          <Text color="whiteAlpha.700" maxW="480px" mx="auto" mb={8}>
            Top jucători MetaShipX clasați după win rate, victorii, EGLD câștigat și acuratețe.
          </Text>

          {/* Quick stats */}
          <Flex gap={4} justify="center" wrap="wrap">
            <StatCard label="Meciuri Total" value={totalGames.toLocaleString()} icon="⚔️" />
            <StatCard label="Top Win Rate" value={`${topWinRate.toFixed(1)}%`} icon="📈" />
            <StatCard label="Max Streak" value={String(topStreak)} sub="victorii consecutive" icon="🔥" />
            <StatCard label="Top EGLD" value={`${topEgld} EGLD`} icon="💎" />
          </Flex>

          {/* Player rank banner */}
          {playerRank && (
            <Box
              mt={6} py={3} px={6}
              bg="whiteAlpha.100" borderRadius="xl"
              display="inline-flex" alignItems="center" gap={3}
            >
              <Text fontSize="2xl">🎖️</Text>
              <Text fontSize="sm">
                Rangul tău la <strong>{CATEGORIES[categoryIdx]?.label}</strong>:{' '}
                <Text as="span" color="yellow.300" fontWeight="bold">
                  #{playerRank.rank} din {playerRank.total}
                </Text>
              </Text>
            </Box>
          )}
        </Container>
      </Box>

      {/* ── Content ── */}
      <Container maxW="container.xl" py={8}>
        {/* Category tabs */}
        <Tabs
          index={categoryIdx}
          onChange={i => setCategory(CATEGORIES[i].id)}
          colorScheme="teal"
          variant="soft-rounded"
          mb={6}
        >
          <TabList flexWrap="wrap" gap={2}>
            {CATEGORIES.map(c => (
              <Tooltip key={c.id} label={c.desc} placement="top">
                <Tab fontSize={{ base: 'xs', md: 'sm' }} px={3} py={2}>
                  {c.icon} {c.label}
                </Tab>
              </Tooltip>
            ))}
          </TabList>
        </Tabs>

        {/* Error */}
        {error && (
          <Alert status="error" borderRadius="lg" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Table */}
        <Box bg={tableBg} borderRadius="xl" shadow="sm" overflow="hidden">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr bg={useColorModeValue('gray.50', 'gray.700')}>
                <Th w="50px">#</Th>
                <Th>Jucător</Th>
                <Th isNumeric>{CATEGORIES[categoryIdx]?.label}</Th>
                <Th isNumeric display={{ base: 'none', md: 'table-cell' }}>V / Î</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Win Rate</Th>
                <Th isNumeric display={{ base: 'none', lg: 'table-cell' }}>Acuratețe</Th>
                <Th isNumeric display={{ base: 'none', md: 'table-cell' }}>EGLD</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <Tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <Td key={j}><Skeleton h="20px" borderRadius="md" /></Td>
                      ))}
                    </Tr>
                  ))
                : entries.map(entry => (
                    <PlayerRow
                      key={entry.address}
                      entry={entry}
                      isMe={entry.address === playerAddress}
                      category={category}
                    />
                  ))
              }
            </Tbody>
          </Table>

          {!loading && entries.length === 0 && (
            <VStack py={16} spacing={3}>
              <Text fontSize="3xl">🌊</Text>
              <Heading size="sm" color="gray.500">Nicio înregistrare</Heading>
              <Text color="gray.400" fontSize="sm">Fii primul care joacă!</Text>
            </VStack>
          )}
        </Box>

        {/* Pagination */}
        <HStack justify="space-between" mt={4} align="center">
          <Text fontSize="sm" color="gray.500">
            {total} jucători înregistrați · Pagina {page}
          </Text>
          <HStack spacing={2}>
            <Button
              size="sm" variant="outline"
              isDisabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ← Anterior
            </Button>
            <Button
              size="sm" variant="outline"
              isDisabled={!hasMore || loading}
              onClick={() => setPage(page + 1)}
            >
              Următor →
            </Button>
          </HStack>
        </HStack>

        {/* Refresh */}
        <Flex justify="center" mt={6}>
          <Button size="xs" variant="ghost" colorScheme="teal" onClick={refresh} isLoading={loading}>
            🔄 Actualizează
          </Button>
        </Flex>
      </Container>
    </Box>
  );
}
