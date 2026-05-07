import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Button,
  SimpleGrid, Badge, Spinner, Alert, AlertIcon, AlertTitle, AlertDescription,
  Input, NumberInput, NumberInputField, Divider, Flex, Progress,
  useToast, useColorModeValue, Tooltip, Tag, TagLabel,
} from '@chakra-ui/react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import { useGame } from '../hooks/useGame';

// ── Constants ───────────────────────────────────────────────────────────────

const SHIP_TYPES = [
  { id: 0, name: 'Carrier',    size: 5, emoji: '✈️'  },
  { id: 1, name: 'Battleship', size: 4, emoji: '🛳️' },
  { id: 2, name: 'Cruiser',    size: 3, emoji: '⛵'  },
  { id: 3, name: 'Submarine',  size: 3, emoji: '🤿'  },
  { id: 4, name: 'Destroyer',  size: 2, emoji: '🚤'  },
];

type Phase = 'lobby' | 'placement' | 'battle' | 'result';

interface PlacedShip {
  shipId: number;
  positions: number[];
  vertical: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function colLabel(idx: number) { return String.fromCharCode(65 + (idx % 10)); }
function rowLabel(idx: number) { return String(Math.floor(idx / 10) + 1); }

// ── Sub-component: Stats bar ─────────────────────────────────────────────────

function StatsBar({ gameId, bet, myHits, enemyHits }: { gameId: string; bet: string; myHits: number; enemyHits: number }) {
  const bg = useColorModeValue('white', 'gray.800');
  return (
    <Box bg={bg} borderRadius="xl" p={3} border="1px" borderColor={useColorModeValue('gray.200','gray.700')} shadow="sm">
      <SimpleGrid columns={4} gap={4} textAlign="center">
        <Box>
          <Text fontSize="xs" color="gray.500">Game ID</Text>
          <Text fontWeight="bold" fontSize="sm" fontFamily="mono">{gameId}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">💰 Pariu</Text>
          <Text fontWeight="bold" fontSize="sm" color="yellow.400">{bet} EGLD</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">🎯 Loviturile mele</Text>
          <Text fontWeight="bold" fontSize="sm" color="green.400">{myHits}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">💥 Loviturile lor</Text>
          <Text fontWeight="bold" fontSize="sm" color="red.400">{enemyHits}</Text>
        </Box>
      </SimpleGrid>
    </Box>
  );
}

// ── Sub-component: Ship palette ──────────────────────────────────────────────

function ShipPalette({
  placed, selected, onSelect, orientation, onToggleOrientation
}: {
  placed: number[];
  selected: number | null;
  onSelect: (id: number) => void;
  orientation: 'horizontal' | 'vertical';
  onToggleOrientation: () => void;
}) {
  const bg = useColorModeValue('white', 'gray.800');
  const borderBase = useColorModeValue('gray.200','gray.700');
  return (
    <Box bg={bg} borderRadius="xl" p={4} border="1px" borderColor={borderBase} shadow="sm">
      <HStack justify="space-between" mb={3}>
        <Text fontWeight="bold" fontSize="sm">🚢 Flota ({placed.length}/{SHIP_TYPES.length} plasate)</Text>
        <Button size="xs" variant="outline" onClick={onToggleOrientation}>
          {orientation === 'horizontal' ? '↔️ Orizontal' : '↕️ Vertical'}
        </Button>
      </HStack>
      <Progress value={(placed.length / SHIP_TYPES.length) * 100} size="xs" colorScheme="blue" borderRadius="full" mb={3} />
      <VStack spacing={2} align="stretch">
        {SHIP_TYPES.map(ship => {
          const isPlaced = placed.includes(ship.id);
          const isSelected = selected === ship.id;
          return (
            <Flex
              key={ship.id}
              p={2} borderRadius="lg" align="center" justify="space-between"
              bg={isPlaced ? useColorModeValue('green.50','green.900') : isSelected ? useColorModeValue('blue.50','blue.900') : 'transparent'}
              border="1px"
              borderColor={isPlaced ? 'green.400' : isSelected ? 'blue.400' : borderBase}
              cursor={isPlaced ? 'default' : 'pointer'}
              opacity={isPlaced ? 0.7 : 1}
              onClick={() => !isPlaced && onSelect(ship.id)}
              _hover={!isPlaced ? { borderColor: 'blue.300' } : {}}
              transition="all 0.15s"
            >
              <HStack spacing={2}>
                <Text fontSize="lg">{ship.emoji}</Text>
                <VStack spacing={0} align="start">
                  <Text fontSize="xs" fontWeight="bold">{ship.name}</Text>
                  <HStack spacing={0}>
                    {Array.from({ length: ship.size }).map((_, i) => (
                      <Box key={i} w={3} h={3} bg={isPlaced ? 'green.400' : isSelected ? 'blue.400' : 'gray.500'} borderRadius={1} mr="1px" />
                    ))}
                  </HStack>
                </VStack>
              </HStack>
              <Badge size="sm" colorScheme={isPlaced ? 'green' : isSelected ? 'blue' : 'gray'} fontSize="9px">
                {isPlaced ? '✓' : isSelected ? 'ACTIV' : `${ship.size}★`}
              </Badge>
            </Flex>
          );
        })}
      </VStack>
    </Box>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { address } = useGetAccountInfo();
  const isLoggedIn  = useGetIsLoggedIn();
  const navigate    = useNavigate();
  const toast       = useToast();
  const [searchParams] = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<Phase>('lobby');
  const [betAmount, setBetAmount]   = useState('0.1');
  const [gameId, setGameId]         = useState<string | null>(
    searchParams.get('gameId') ?? null
  );
  const [joinGameId, setJoinGameId] = useState(searchParams.get('join') ?? '');
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
  const [selectedShip, setSelectedShip] = useState<number | null>(null);
  const [orientation, setOrientation]   = useState<'horizontal' | 'vertical'>('horizontal');
  const [myBoard,    setMyBoard]    = useState<string[]>(Array(100).fill('empty'));
  const [enemyBoard, setEnemyBoard] = useState<string[]>(Array(100).fill('empty'));
  const [isMyTurn,   setIsMyTurn]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [myHits,     setMyHits]     = useState(0);
  const [enemyHits,  setEnemyHits]  = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { gameState, attack: doAttack, placeShips: doPlaceShips, createGame, joinGame } = useGame(gameId ?? '');

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  // ── Sync game state from hook ──────────────────────────────────────────────
  useEffect(() => {
    if (!gameState) return;
    const gp = gameState.phase;
    if (gp === 'placement' && phase === 'lobby') setPhase('placement');
    if (gp === 'battle')   { setPhase('battle'); setIsMyTurn(gameState.currentTurn === address); }
    if (gp === 'finished') setPhase('result');
    if (gameState.myBoard)    setMyBoard(gameState.myBoard);
    if (gameState.enemyBoard) setEnemyBoard(gameState.enemyBoard);
    if (gameState.myHits    !== undefined) setMyHits(gameState.myHits);
    if (gameState.enemyHits !== undefined) setEnemyHits(gameState.enemyHits);
  }, [gameState, address]);

  // ── Polling: refresh game state every 5s during battle/placement ───────────
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      // useGame hook auto-refetches on gameId change; trigger manual refresh via key bump
      // A simple way: dispatch a custom event that useGame listens to
      window.dispatchEvent(new CustomEvent('metashipx:poll'));
    }, 5000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    if (phase === 'placement' || phase === 'battle') startPolling();
    else stopPolling();
    return stopPolling;
  }, [phase, startPolling, stopPolling]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateGame = async () => {
    setLoading(true);
    try {
      const newId = await createGame(betAmount);
      setGameId(newId);
      setPhase('placement');
      toast({ title: '🎮 Joc creat!', description: `ID: ${newId} — trimite-l adversarului`, status: 'success', duration: 6000, isClosable: true });
    } catch (e: any) {
      toast({ title: 'Eroare', description: e.message, status: 'error' });
    } finally { setLoading(false); }
  };

  const handleJoinGame = async () => {
    if (!joinGameId.trim()) return;
    setLoading(true);
    try {
      await joinGame(joinGameId.trim(), betAmount);
      setGameId(joinGameId.trim());
      setPhase('placement');
      toast({ title: '✅ Ai intrat în joc!', status: 'success' });
    } catch (e: any) {
      toast({ title: 'Eroare', description: e.message, status: 'error' });
    } finally { setLoading(false); }
  };

  const handleBoardClick = (index: number) => {
    if (phase === 'placement') handlePlacementClick(index);
    else if (phase === 'battle' && isMyTurn) handleAttackClick(index);
  };

  const handlePlacementClick = (index: number) => {
    if (selectedShip === null) { toast({ title: 'Selectează o navă mai întâi', status: 'warning', duration: 2000 }); return; }
    if (placedShips.some(s => s.shipId === selectedShip)) return;

    const ship = SHIP_TYPES[selectedShip];
    const positions: number[] = [];
    const row = Math.floor(index / 10);
    const col = index % 10;

    for (let i = 0; i < ship.size; i++) {
      if (orientation === 'horizontal') {
        if (col + i >= 10) { toast({ title: 'Nava iese din tablă (dreapta)', status: 'warning', duration: 2000 }); return; }
        positions.push(row * 10 + col + i);
      } else {
        if (row + i >= 10) { toast({ title: 'Nava iese din tablă (jos)', status: 'warning', duration: 2000 }); return; }
        positions.push((row + i) * 10 + col);
      }
    }

    // Overlap check
    const occupied = placedShips.flatMap(s => s.positions);
    if (positions.some(p => occupied.includes(p))) {
      toast({ title: 'Celulă ocupată!', status: 'warning', duration: 2000 }); return;
    }

    const newBoard = [...myBoard];
    positions.forEach(p => { newBoard[p] = 'ship'; });
    setMyBoard(newBoard);
    setPlacedShips(prev => [...prev, { shipId: selectedShip, positions, vertical: orientation === 'vertical' }]);
    setSelectedShip(null);

    toast({ title: `${ship.emoji} ${ship.name} plasat!`, status: 'success', duration: 1500 });
  };

  const handleAttackClick = async (index: number) => {
    if (enemyBoard[index] !== 'empty') {
      toast({ title: 'Celulă deja atacată', status: 'warning', duration: 1500 }); return;
    }
    setLoading(true);
    try {
      const row = Math.floor(index / 10);
      const col = index % 10;
      const result = await doAttack(row, col);

      const newEnemy = [...enemyBoard];
      newEnemy[index] = result === 'Miss' ? 'miss' : 'hit';
      setEnemyBoard(newEnemy);

      if (result === 'Hit' || result === 'Sunk' || result === 'GameOver') {
        setMyHits(h => h + 1);
      }

      const resultEmoji = result === 'Miss' ? '💦 Miss' : result === 'Hit' ? '🔥 Hit!' : result === 'Sunk' ? '💥 Scufundat!' : '🏆 VICTORIE!';
      toast({
        title: `${resultEmoji} la ${colLabel(index)}${rowLabel(index)}`,
        status: result === 'Miss' ? 'info' : result === 'GameOver' ? 'success' : 'warning',
        duration: 2500,
      });

      if (result === 'GameOver') { setPhase('result'); }
      else { setIsMyTurn(false); }
    } catch (e: any) {
      toast({ title: 'Eroare atac', description: e.message, status: 'error' });
    } finally { setLoading(false); }
  };

  const handleConfirmPlacement = async () => {
    if (placedShips.length < SHIP_TYPES.length) {
      toast({ title: `Plasează toate navele! (${placedShips.length}/${SHIP_TYPES.length})`, status: 'warning' }); return;
    }
    setLoading(true);
    try {
      // Build positions array: [x, y, length, isVertical] per ship (ordered by SHIP_LENGTHS = 5,4,3,3,2)
      // SHIP_TYPES order: carrier(5), battleship(4), cruiser(3), submarine(3), destroyer(2)
      const sortedByContract = [0, 1, 2, 3, 4].map(id => placedShips.find(s => s.shipId === id)!);
      const flat = sortedByContract.flatMap(s => {
        const firstPos = s.positions[0];
        const row = Math.floor(firstPos / 10);
        const col = firstPos % 10;
        return [row, col, SHIP_TYPES[s.shipId].size, s.vertical ? 1 : 0];
      });
      await doPlaceShips(flat);
      setPhase('battle');
      toast({ title: '⚓ Nave plasate!', description: 'Jocul a început!', status: 'success' });
    } catch (e: any) {
      toast({ title: 'Eroare', description: e.message, status: 'error' });
    } finally { setLoading(false); }
  };

  const resetGame = () => {
    setPhase('lobby');
    setGameId(null);
    setJoinGameId('');
    setMyBoard(Array(100).fill('empty'));
    setEnemyBoard(Array(100).fill('empty'));
    setPlacedShips([]);
    setSelectedShip(null);
    setMyHits(0);
    setEnemyHits(0);
    setIsMyTurn(false);
  };

  const heroBg = useColorModeValue('white', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box minH="100vh">

      {/* ── LOBBY ──────────────────────────────────────────────────────── */}
      {phase === 'lobby' && (
        <Box>
          {/* Hero banner */}
          <Box
            bgGradient="linear(to-br, blue.900, cyan.900, gray.900)"
            py={{ base: 10, md: 16 }} px={4} textAlign="center"
            position="relative" overflow="hidden"
          >
            <Box
              position="absolute" inset={0} opacity={0.04} pointerEvents="none"
              backgroundImage="repeating-linear-gradient(0deg,white 0,white 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,white 0,white 1px,transparent 1px,transparent 40px)"
            />
            <Container maxW="container.md" position="relative">
              <Text fontSize={{ base: '3xl', md: '5xl' }} mb={2}>⚓</Text>
              <Heading
                size={{ base: 'xl', md: '2xl' }} mb={3}
                bgGradient="linear(to-r, blue.300, cyan.300)" bgClip="text"
              >MetaShipX Battle</Heading>
              <Text color="whiteAlpha.700" fontSize="md" maxW="400px" mx="auto">
                Battleship pe blockchain — pariezi EGLD, câștigătorul ia totul.
              </Text>
            </Container>
          </Box>

          <Container maxW="container.lg" py={10}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>

              {/* Create card */}
              <Box bg={cardBg} borderRadius="2xl" p={6} border="1px" borderColor={borderColor} shadow="md">
                <VStack spacing={4} align="stretch">
                  <HStack spacing={3}>
                    <Text fontSize="2xl">🎮</Text>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="lg">Crează Joc</Text>
                      <Text fontSize="xs" color="gray.500">Tu ești gazda — adversarul se alătură cu același pariu</Text>
                    </VStack>
                  </HStack>
                  <Divider />
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Pariu (EGLD)</Text>
                    <NumberInput value={betAmount} min={0.01} step={0.05} precision={3} onChange={v => setBetAmount(v)}>
                      <NumberInputField />
                    </NumberInput>
                  </Box>
                  <Button
                    colorScheme="blue" size="lg" w="full"
                    leftIcon={<Text>⚔️</Text>}
                    onClick={handleCreateGame} isLoading={loading} loadingText="Se creează...">
                    Crează Joc
                  </Button>
                </VStack>
              </Box>

              {/* Join card */}
              <Box bg={cardBg} borderRadius="2xl" p={6} border="1px" borderColor={borderColor} shadow="md">
                <VStack spacing={4} align="stretch">
                  <HStack spacing={3}>
                    <Text fontSize="2xl">🚪</Text>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="lg">Alătură-te</Text>
                      <Text fontSize="xs" color="gray.500">Introdu ID-ul primit de la adversar</Text>
                    </VStack>
                  </HStack>
                  <Divider />
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Game ID</Text>
                    <Input
                      placeholder="ex: 42"
                      value={joinGameId}
                      onChange={e => setJoinGameId(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleJoinGame()}
                      fontFamily="mono"
                    />
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Pariu (EGLD)</Text>
                    <NumberInput value={betAmount} min={0.01} step={0.05} precision={3} onChange={v => setBetAmount(v)}>
                      <NumberInputField />
                    </NumberInput>
                  </Box>
                  <Button
                    colorScheme="purple" size="lg" w="full"
                    leftIcon={<Text>🔗</Text>}
                    onClick={handleJoinGame} isLoading={loading} loadingText="Se alătură..."
                    isDisabled={!joinGameId.trim()}>
                    Alătură-te la Joc
                  </Button>
                </VStack>
              </Box>
            </SimpleGrid>

            {/* Game created confirmation */}
            {gameId && (
              <Alert status="success" borderRadius="xl" mt={6}>
                <AlertIcon />
                <Box flex={1}>
                  <AlertTitle>Joc creat!</AlertTitle>
                  <AlertDescription>
                    Trimite acest Game ID adversarului:{' '}
                    <Text as="span" fontFamily="mono" fontWeight="bold" color="green.600">{gameId}</Text>
                  </AlertDescription>
                </Box>
                <Button size="sm" colorScheme="green" variant="outline" onClick={() => { navigator.clipboard?.writeText(gameId); toast({ title: 'ID copiat!', status: 'info', duration: 1500 }); }}>
                  📋 Copiază
                </Button>
              </Alert>
            )}
          </Container>
        </Box>
      )}

      {/* ── PLACEMENT ──────────────────────────────────────────────────── */}
      {phase === 'placement' && (
        <Container maxW="container.xl" py={8}>
          <VStack spacing={6}>
            <HStack justify="space-between" w="full" flexWrap="wrap" gap={3}>
              <VStack align="start" spacing={0}>
                <Heading size="lg">⚓ Plasează Navele</Heading>
                <Text color="gray.500" fontSize="sm">Selectează o navă din listă, apoi click pe tablă</Text>
              </VStack>
              <HStack>
                <Badge colorScheme="blue" p={2} borderRadius="lg" fontSize="sm">
                  Game #{gameId}
                </Badge>
                <Button
                  colorScheme="green" size="md"
                  onClick={handleConfirmPlacement}
                  isLoading={loading}
                  isDisabled={placedShips.length < SHIP_TYPES.length}
                  leftIcon={<Text>✓</Text>}
                >
                  Confirmă Plasarea
                </Button>
              </HStack>
            </HStack>

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} w="full">
              <Box>
                <Text fontWeight="bold" mb={3} color="cyan.500" fontSize="sm">🗺️ Tabla ta</Text>
                <GameBoard
                  board={myBoard}
                  onCellClick={handleBoardClick}
                  isInteractive={true}
                  label="Plasare nave"
                />
              </Box>
              <ShipPalette
                placed={placedShips.map(s => s.shipId)}
                selected={selectedShip}
                onSelect={setSelectedShip}
                orientation={orientation}
                onToggleOrientation={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}
              />
            </SimpleGrid>

            {/* Waiting for opponent tip */}
            {placedShips.length < SHIP_TYPES.length && (
              <Alert status="info" borderRadius="xl">
                <AlertIcon />
                Plasează {SHIP_TYPES.length - placedShips.length} nave rămase
              </Alert>
            )}
          </VStack>
        </Container>
      )}

      {/* ── BATTLE ─────────────────────────────────────────────────────── */}
      {phase === 'battle' && (
        <Container maxW="container.xl" py={8}>
          <VStack spacing={5}>
            {/* Turn indicator */}
            <Box
              w="full" py={3} px={6} borderRadius="xl" textAlign="center"
              bg={isMyTurn ? 'green.900' : 'gray.800'}
              border="2px" borderColor={isMyTurn ? 'green.400' : 'gray.600'}
              transition="all 0.3s"
            >
              <Text fontSize="lg" fontWeight="bold" color={isMyTurn ? 'green.300' : 'gray.400'}>
                {isMyTurn ? '🎯 Rândul tău — Click pe tabla adversarului pentru atac!' : '⏳ Rândul adversarului — Așteaptă...'}
              </Text>
            </Box>

            <StatsBar
              gameId={gameId ?? ''}
              bet={betAmount}
              myHits={myHits}
              enemyHits={enemyHits}
            />

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} w="full">
              <Box>
                <HStack mb={3} justify="space-between">
                  <Text fontWeight="bold" color="red.400" fontSize="sm">🎯 Tabla Adversarului</Text>
                  {isMyTurn && (
                    <Tag colorScheme="green" size="sm"><TagLabel>Click pentru atac</TagLabel></Tag>
                  )}
                </HStack>
                <GameBoard
                  board={enemyBoard}
                  onCellClick={isMyTurn ? handleBoardClick : undefined}
                  isInteractive={isMyTurn}
                  label="Board adversar"
                />
              </Box>
              <Box>
                <Text fontWeight="bold" mb={3} color="cyan.400" fontSize="sm">🛡️ Tabla Ta</Text>
                <GameBoard
                  board={myBoard}
                  isInteractive={false}
                  label="Board tău"
                />
              </Box>
            </SimpleGrid>

            {loading && (
              <HStack bg={cardBg} p={3} borderRadius="xl" border="1px" borderColor={borderColor}>
                <Spinner color="cyan.400" size="sm" />
                <Text fontSize="sm" color="gray.400">Procesare tranzacție on-chain...</Text>
              </HStack>
            )}
          </VStack>
        </Container>
      )}

      {/* ── RESULT ─────────────────────────────────────────────────────── */}
      {phase === 'result' && (
        <Container maxW="container.md" py={16}>
          <VStack spacing={8} align="center" textAlign="center">
            <Box
              bgGradient={gameState?.winner === address
                ? 'linear(to-br, yellow.900, orange.900)'
                : 'linear(to-br, red.900, gray.900)'}
              borderRadius="2xl" p={10} w="full"
              border="2px" borderColor={gameState?.winner === address ? 'yellow.400' : 'red.700'}
              shadow="xl"
            >
              <Text fontSize="6xl" mb={4}>{gameState?.winner === address ? '🏆' : '💀'}</Text>
              <Heading
                size="2xl" mb={3}
                color={gameState?.winner === address ? 'yellow.300' : 'red.300'}
              >
                {gameState?.winner === address ? 'VICTORIE!' : 'ÎNFRÂNGERE'}
              </Heading>
              <Text color="whiteAlpha.800" fontSize="lg" mb={2}>
                {gameState?.winner === address
                  ? `+${(parseFloat(betAmount) * 2).toFixed(3)} EGLD transferați în wallet`
                  : 'Adversarul a câștigat pariul. Încearcă din nou!'}
              </Text>
              <HStack justify="center" spacing={4} mt={2}>
                <Badge colorScheme="blue" fontSize="sm" p={2}>🎯 {myHits} lovituri</Badge>
                <Badge colorScheme="red"  fontSize="sm" p={2}>💥 {enemyHits} primite</Badge>
              </HStack>
            </Box>

            <HStack spacing={4} flexWrap="wrap" justify="center">
              <Button colorScheme="blue" size="lg" leftIcon={<Text>🔄</Text>} onClick={resetGame}>
                Joc Nou
              </Button>
              <Button variant="outline" size="lg" leftIcon={<Text>🏆</Text>} onClick={() => navigate('/tournaments')}>
                Turnee
              </Button>
              <Button variant="outline" size="lg" leftIcon={<Text>🏅</Text>} onClick={() => navigate('/leaderboard')}>
                Leaderboard
              </Button>
            </HStack>
          </VStack>
        </Container>
      )}
    </Box>
  );
}
