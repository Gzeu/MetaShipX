import React, { useState, useMemo } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Grid, GridItem,
  Badge, Button, Flex, Tabs, TabList, Tab, TabPanels, TabPanel,
  Skeleton, Alert, AlertIcon, Avatar, Tooltip, Divider,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, useDisclosure, useColorModeValue,
  Stat, StatLabel, StatNumber, Progress, Tag,
} from '@chakra-ui/react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { useTournamentList, useTournamentDetail } from '../hooks/useTournament';
import { Tournament, BracketMatch, TournamentPlayer, registerForTournament } from '../services/tournament.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Început';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}z ${h % 24}h`;
  return `${h}h ${m}m`;
}

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  registration: { label: 'Înregistrare',  color: 'blue',   icon: '📋' },
  active:       { label: 'În desfășurare', color: 'green', icon: '⚔️' },
  completed:    { label: 'Finalizat',      color: 'gray',  icon: '🏁' },
};

const ROUND_LABELS: Record<number, string> = { 1: 'Sferturi', 2: 'Semifinale', 3: 'Finală', 4: 'Finală' };
function roundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return '🏆 Finală';
  if (round === totalRounds - 1) return '🥊 Semifinale';
  if (round === totalRounds - 2) return '⚔️ Sferturi';
  return `Runda ${round}`;
}

// ── MatchCard ────────────────────────────────────────────────────────────────

function PlayerSlot({ player, isWinner, side }: { player: TournamentPlayer | null; isWinner: boolean; side: 'left' | 'right' }) {
  const bg    = useColorModeValue(isWinner ? 'green.50' : 'white', isWinner ? 'green.900' : 'gray.800');
  const border = isWinner ? 'green.400' : useColorModeValue('gray.200', 'gray.600');
  return (
    <Flex
      align="center" gap={2} px={3} py={2}
      bg={bg} borderRadius="md" border="1px" borderColor={border}
      minW="140px" flex={1}
      flexDir={side === 'right' ? 'row-reverse' : 'row'}
    >
      {player ? (
        <>
          <Avatar size="xs" name={player.address}
            bg={`hsl(${parseInt(player.address.slice(-4), 16) % 360},60%,55%)`}
          />
          <VStack spacing={0} align={side === 'right' ? 'end' : 'start'} flex={1}>
            <Text fontSize="xs" fontWeight={isWinner ? 'bold' : 'normal'}>{shortAddr(player.address)}</Text>
            <Text fontSize="9px" color="gray.500">S#{player.seed} · {player.wins}V</Text>
          </VStack>
          {isWinner && <Text fontSize="sm">🏆</Text>}
        </>
      ) : (
        <Text fontSize="xs" color="gray.400" fontStyle="italic">TBD</Text>
      )}
    </Flex>
  );
}

function MatchCard({ match, totalRounds }: { match: BracketMatch; totalRounds: number }) {
  const cardBg = useColorModeValue('gray.50', 'gray.750');
  const statusColors: Record<string, string> = { pending: 'gray', active: 'orange', completed: 'green', bye: 'purple' };
  return (
    <Box
      bg={cardBg} borderRadius="xl" p={3} shadow="sm"
      border="1px" borderColor={match.status === 'active' ? 'orange.400' : useColorModeValue('gray.200','gray.700')}
      w={{ base: '100%', md: '280px' }}
      position="relative"
    >
      {match.status === 'active' && (
        <Box position="absolute" top={-2} right={3}>
          <Badge colorScheme="orange" fontSize="9px" animation="pulse 1.5s infinite">LIVE</Badge>
        </Box>
      )}
      <Text fontSize="9px" color="gray.400" mb={2} textTransform="uppercase" letterSpacing="wide">
        {roundLabel(match.round, totalRounds)} · Meci {match.matchIndex + 1}
      </Text>
      <VStack spacing={2}>
        <PlayerSlot player={match.player1} isWinner={match.winner?.address === match.player1?.address} side="left" />
        <HStack w="full" spacing={1} align="center">
          <Divider />
          <Text fontSize="10px" color="gray.400" fontWeight="bold" whiteSpace="nowrap">VS</Text>
          <Divider />
        </HStack>
        <PlayerSlot player={match.player2} isWinner={match.winner?.address === match.player2?.address} side="left" />
      </VStack>
      {match.gameId && (
        <Text fontSize="9px" color="gray.400" mt={2} textAlign="center">ID: {match.gameId}</Text>
      )}
    </Box>
  );
}

// ── BracketView ───────────────────────────────────────────────────────────────

function BracketView({ tournament }: { tournament: Tournament }) {
  const rounds = Array.from({ length: tournament.rounds }, (_, i) => i + 1);
  const matchesByRound = useMemo(() =>
    rounds.map(r => tournament.bracket.filter(m => m.round === r)),
    [tournament.bracket, rounds]
  );
  const headerBg = useColorModeValue('gray.100', 'gray.800');

  return (
    <Box overflowX="auto" pb={4}>
      <Flex gap={6} align="flex-start" minW="max-content" px={2}>
        {matchesByRound.map((rMatches, ri) => (
          <VStack key={ri} spacing={0} align="center">
            {/* Round header */}
            <Box bg={headerBg} px={4} py={2} borderRadius="lg" mb={4}>
              <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
                {roundLabel(ri + 1, tournament.rounds)}
              </Text>
            </Box>
            {/* Matches stacked with spacing proportional to round */}
            <VStack spacing={Math.pow(2, ri) * 16 + 8 + 'px' as any}>
              {rMatches.map(match => (
                <MatchCard key={match.id} match={match} totalRounds={tournament.rounds} />
              ))}
            </VStack>
          </VStack>
        ))}

        {/* Champion */}
        {tournament.status === 'completed' && (() => {
          const final = tournament.bracket.find(m => m.round === tournament.rounds);
          const champion = final?.winner;
          return champion ? (
            <VStack spacing={0} align="center">
              <Box bg={headerBg} px={4} py={2} borderRadius="lg" mb={4}>
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">🏆 Campion</Text>
              </Box>
              <Box
                bg="yellow.500" color="white" borderRadius="xl" p={4} shadow="lg"
                textAlign="center" w="160px"
              >
                <Text fontSize="2xl" mb={1}>🏆</Text>
                <Avatar size="sm" name={champion.address}
                  bg={`hsl(${parseInt(champion.address.slice(-4),16) % 360},60%,55%)`} mb={1}
                />
                <Text fontSize="xs" fontWeight="bold">{shortAddr(champion.address)}</Text>
                <Text fontSize="9px" opacity={0.8}>S#{champion.seed} · {champion.wins} victorii</Text>
              </Box>
            </VStack>
          ) : null;
        })()}
      </Flex>
    </Box>
  );
}

// ── TournamentCard ────────────────────────────────────────────────────────────

function TournamentCard({ tournament, onSelect }: { tournament: Tournament; onSelect: (t: Tournament) => void }) {
  const bg = useColorModeValue('white', 'gray.800');
  const { label, color, icon } = STATUS_META[tournament.status];
  const filled = tournament.registeredPlayers.length;
  const pct = (filled / tournament.maxPlayers) * 100;
  const countdown = tournament.startTime - Date.now();

  return (
    <Box bg={bg} borderRadius="xl" p={5} shadow="sm" border="1px"
      borderColor={useColorModeValue('gray.200','gray.700')}
      _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
      transition="all 0.2s" cursor="pointer" onClick={() => onSelect(tournament)}
    >
      <Flex justify="space-between" align="flex-start" mb={3}>
        <VStack align="start" spacing={1}>
          <Heading size="sm">{icon} {tournament.name}</Heading>
          <Text fontSize="xs" color="gray.500">{tournament.description.slice(0, 80)}…</Text>
        </VStack>
        <Badge colorScheme={color} ml={2} flexShrink={0}>{label}</Badge>
      </Flex>

      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={4}>
        <Stat size="sm">
          <StatLabel fontSize="9px">💎 Premiu</StatLabel>
          <StatNumber fontSize="sm">{tournament.prizePool} EGLD</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel fontSize="9px">🎫 Intrare</StatLabel>
          <StatNumber fontSize="sm">{tournament.entryFee} EGLD</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel fontSize="9px">👥 Jucători</StatLabel>
          <StatNumber fontSize="sm">{filled}/{tournament.maxPlayers}</StatNumber>
        </Stat>
      </Grid>

      <Progress value={pct} size="xs" colorScheme={color} borderRadius="full" mb={3} />

      <Flex justify="space-between" align="center">
        {tournament.status === 'registration' ? (
          <Text fontSize="xs" color="blue.400">⏰ Start: {formatCountdown(countdown)}</Text>
        ) : tournament.status === 'active' ? (
          <Text fontSize="xs" color="green.400">⚔️ În desfășurare</Text>
        ) : (
          <Text fontSize="xs" color="gray.400">🏁 Finalizat</Text>
        )}
        <Button size="xs" colorScheme={color} variant="outline">Vezi Bracket →</Button>
      </Flex>
    </Box>
  );
}

// ── PlayersTab ────────────────────────────────────────────────────────────────

function PlayersTab({ tournament }: { tournament: Tournament }) {
  const bg = useColorModeValue('white', 'gray.800');
  const slots = Array.from({ length: tournament.maxPlayers }, (_, i) =>
    tournament.registeredPlayers[i] ?? null
  );
  return (
    <Grid templateColumns={{ base: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }} gap={3}>
      {slots.map((p, i) => (
        <Flex key={i} bg={bg} borderRadius="lg" p={3} align="center" gap={3}
          border="1px" borderColor={p ? useColorModeValue('gray.200','gray.700') : useColorModeValue('gray.100','gray.800')}
          opacity={p ? 1 : 0.5}
        >
          {p ? (
            <>
              <Avatar size="sm" name={p.address}
                bg={`hsl(${parseInt(p.address.slice(-4),16)%360},60%,55%)`}
              />
              <VStack spacing={0} align="start">
                <Text fontSize="xs" fontWeight="bold">S#{p.seed} {shortAddr(p.address)}</Text>
                <Text fontSize="9px" color="gray.500">{p.wins} victorii</Text>
              </VStack>
            </>
          ) : (
            <Text fontSize="xs" color="gray.400" fontStyle="italic">Loc liber #{i + 1}</Text>
          )}
        </Flex>
      ))}
    </Grid>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const { tournaments, loading, error, refresh } = useTournamentList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { tournament: selected, loading: detailLoading } = useTournamentDetail(selectedId);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { account } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();
  const [registering, setRegistering] = useState(false);

  const headerBg = useColorModeValue('white', 'gray.900');

  const handleSelect = (t: Tournament) => {
    setSelectedId(t.id);
    onOpen();
  };

  const handleRegister = async () => {
    if (!selectedId || !account?.address) return;
    setRegistering(true);
    try {
      await registerForTournament(selectedId, account.address);
      refresh();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setRegistering(false);
    }
  };

  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const openTournaments   = tournaments.filter(t => t.status === 'registration');
  const doneT             = tournaments.filter(t => t.status === 'completed');

  return (
    <Box>
      {/* Hero */}
      <Box
        bgGradient="linear(to-br, purple.900, blue.900, gray.900)"
        color="white" py={{ base: 10, md: 16 }} px={4} textAlign="center"
        position="relative" overflow="hidden"
      >
        <Box position="absolute" inset={0} opacity={0.05}
          backgroundImage="repeating-linear-gradient(0deg,white 0,white 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,white 0,white 1px,transparent 1px,transparent 40px)"
          pointerEvents="none"
        />
        <Container maxW="container.md" position="relative">
          <Text fontSize="4xl" mb={2}>🏆</Text>
          <Heading size={{ base: 'xl', md: '2xl' }} mb={3} letterSpacing="tight">Turnee MetaShipX</Heading>
          <Text color="whiteAlpha.700" maxW="460px" mx="auto" mb={8}>
            Single-elimination bracket. Înregistrează-te, câștigă meciurile, devino campion și revendică premiul EGLD.
          </Text>
          <HStack justify="center" spacing={6} wrap="wrap">
            <VStack spacing={0}><Text fontSize="2xl" fontWeight="bold">{activeTournaments.length}</Text><Text fontSize="xs" color="whiteAlpha.600">Active</Text></VStack>
            <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.300" />
            <VStack spacing={0}><Text fontSize="2xl" fontWeight="bold">{openTournaments.length}</Text><Text fontSize="xs" color="whiteAlpha.600">Înregistrare deschisă</Text></VStack>
            <Divider orientation="vertical" h="40px" borderColor="whiteAlpha.300" />
            <VStack spacing={0}>
              <Text fontSize="2xl" fontWeight="bold">
                {tournaments.reduce((s, t) => s + parseFloat(t.prizePool), 0).toFixed(1)} EGLD
              </Text>
              <Text fontSize="xs" color="whiteAlpha.600">Total premii</Text>
            </VStack>
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        {error && <Alert status="error" borderRadius="lg" mb={4}><AlertIcon />{error}</Alert>}

        <Tabs colorScheme="purple" variant="soft-rounded">
          <TabList mb={6} gap={2}>
            <Tab fontSize="sm">⚔️ Active ({activeTournaments.length})</Tab>
            <Tab fontSize="sm">📋 Înregistrare ({openTournaments.length})</Tab>
            <Tab fontSize="sm">🏁 Finalizate ({doneT.length})</Tab>
          </TabList>
          <TabPanels>
            {[activeTournaments, openTournaments, doneT].map((list, ti) => (
              <TabPanel key={ti} px={0}>
                {loading ? (
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }} gap={4}>
                    {[1,2,3].map(i => <Skeleton key={i} h="200px" borderRadius="xl" />)}
                  </Grid>
                ) : list.length === 0 ? (
                  <VStack py={16} spacing={3}>
                    <Text fontSize="3xl">🌊</Text>
                    <Heading size="sm" color="gray.500">Niciun turneu în această categorie</Heading>
                  </VStack>
                ) : (
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }} gap={4}>
                    {list.map(t => <TournamentCard key={t.id} tournament={t} onSelect={handleSelect} />)}
                  </Grid>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Container>

      {/* Bracket Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="full" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>
            {selected ? (
              <HStack spacing={3}>
                <Text>{STATUS_META[selected.status].icon}</Text>
                <VStack align="start" spacing={0}>
                  <Text>{selected.name}</Text>
                  <Badge colorScheme={STATUS_META[selected.status].color} fontSize="xs">
                    {STATUS_META[selected.status].label}
                  </Badge>
                </VStack>
              </HStack>
            ) : 'Turneu'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={8}>
            {detailLoading && <Skeleton h="400px" borderRadius="xl" />}
            {selected && (
              <Tabs colorScheme="purple" variant="soft-rounded">
                <TabList mb={6} gap={2}>
                  <Tab fontSize="sm">🏆 Bracket</Tab>
                  <Tab fontSize="sm">👥 Jucători ({selected.registeredPlayers.length}/{selected.maxPlayers})</Tab>
                  <Tab fontSize="sm">ℹ️ Detalii</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}><BracketView tournament={selected} /></TabPanel>
                  <TabPanel px={0}><PlayersTab tournament={selected} /></TabPanel>
                  <TabPanel px={0}>
                    <VStack align="start" spacing={4} maxW="500px">
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>Descriere</Text>
                        <Text>{selected.description}</Text>
                      </Box>
                      <Grid templateColumns="repeat(2,1fr)" gap={4} w="full">
                        <Stat><StatLabel fontSize="xs">💎 Premiu pool</StatLabel><StatNumber>{selected.prizePool} EGLD</StatNumber></Stat>
                        <Stat><StatLabel fontSize="xs">🎫 Taxă intrare</StatLabel><StatNumber>{selected.entryFee} EGLD</StatNumber></Stat>
                        <Stat><StatLabel fontSize="xs">👥 Locuri</StatLabel><StatNumber>{selected.registeredPlayers.length}/{selected.maxPlayers}</StatNumber></Stat>
                        <Stat><StatLabel fontSize="xs">🔢 Runde</StatLabel><StatNumber>{selected.rounds}</StatNumber></Stat>
                      </Grid>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
          <ModalFooter>
            {selected?.status === 'registration' && isLoggedIn && (
              <Button
                colorScheme="purple" mr={3}
                isLoading={registering}
                onClick={handleRegister}
              >
                🎫 Înregistrează-te ({selected.entryFee} EGLD)
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Închide</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
