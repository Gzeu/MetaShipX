import { useState, useEffect } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Button,
  SimpleGrid, Badge, Stat, StatLabel, StatNumber, StatHelpText,
  useToast, Spinner, Alert, AlertIcon, AlertTitle, AlertDescription,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Input, NumberInput, NumberInputField,
  Divider, Flex, Icon, Tooltip,
} from '@chakra-ui/react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { useNavigate } from 'react-router-dom';
import GameBoard from '../components/GameBoard/GameBoard';
import { useGame } from '../hooks/useGame';

const SHIP_TYPES = [
  { id: 0, name: 'Destroyer', size: 2, emoji: '🚤' },
  { id: 1, name: 'Submarine', size: 3, emoji: '🤿' },
  { id: 2, name: 'Cruiser', size: 3, emoji: '⛵' },
  { id: 3, name: 'Battleship', size: 4, emoji: '🛳️' },
  { id: 4, name: 'Carrier', size: 5, emoji: '✈️' },
];

type Phase = 'lobby' | 'placement' | 'battle' | 'result';

interface PlacedShip {
  shipId: number;
  positions: number[];
}

export default function GamePage() {
  const { address } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [betAmount, setBetAmount] = useState('0.1');
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinGameId, setJoinGameId] = useState('');
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
  const [selectedShip, setSelectedShip] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [myBoard, setMyBoard] = useState<string[]>(Array(100).fill('empty'));
  const [enemyBoard, setEnemyBoard] = useState<string[]>(Array(100).fill('empty'));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [loading, setLoading] = useState(false);

  const { gameState, attack, placeShips, createGame, joinGame } = useGame(gameId || '');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (gameState) {
      if (gameState.phase === 'placement') setPhase('placement');
      else if (gameState.phase === 'battle') {
        setPhase('battle');
        setIsMyTurn(gameState.currentTurn === address);
      } else if (gameState.phase === 'finished') setPhase('result');

      if (gameState.myBoard) setMyBoard(gameState.myBoard);
      if (gameState.enemyBoard) setEnemyBoard(gameState.enemyBoard);
    }
  }, [gameState, address]);

  const handleCreateGame = async () => {
    setLoading(true);
    try {
      const newGameId = await createGame(betAmount);
      setGameId(newGameId);
      setPhase('placement');
      toast({ title: 'Joc creat!', description: `Game ID: ${newGameId}`, status: 'success', duration: 5000 });
    } catch (e: any) {
      toast({ title: 'Eroare', description: e.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    setLoading(true);
    try {
      await joinGame(joinGameId, betAmount);
      setGameId(joinGameId);
      setPhase('placement');
      onClose();
      toast({ title: 'Ai intrat în joc!', status: 'success' });
    } catch (e: any) {
      toast({ title: 'Eroare', description: e.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (index: number) => {
    if (phase === 'placement' && selectedShip !== null) {
      const ship = SHIP_TYPES[selectedShip];
      const positions: number[] = [];
      for (let i = 0; i < ship.size; i++) {
        const pos = orientation === 'horizontal' ? index + i : index + i * 10;
        if (pos >= 100) { toast({ title: 'Poziție invalidă', status: 'warning' }); return; }
        if (orientation === 'horizontal' && Math.floor(pos / 10) !== Math.floor(index / 10)) {
          toast({ title: 'Nava iese din rând', status: 'warning' }); return;
        }
        positions.push(pos);
      }
      const alreadyUsed = placedShips.some(s => s.positions.some(p => positions.includes(p)));
      if (alreadyUsed) { toast({ title: 'Celulă ocupată', status: 'warning' }); return; }

      const newBoard = [...myBoard];
      positions.forEach(p => { newBoard[p] = 'ship'; });
      setMyBoard(newBoard);
      setPlacedShips(prev => [...prev, { shipId: selectedShip, positions }]);
      setSelectedShip(null);
    } else if (phase === 'battle' && isMyTurn) {
      if (enemyBoard[index] !== 'empty') return;
      handleAttack(index);
    }
  };

  const handleAttack = async (index: number) => {
    setLoading(true);
    try {
      const row = Math.floor(index / 10);
      const col = index % 10;
      await attack(row, col);
      const newEnemy = [...enemyBoard];
      newEnemy[index] = 'attacked';
      setEnemyBoard(newEnemy);
      setIsMyTurn(false);
      toast({ title: `Atac la ${String.fromCharCode(65 + col)}${row + 1}`, status: 'info', duration: 2000 });
    } catch (e: any) {
      toast({ title: 'Eroare atac', description: e.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPlacement = async () => {
    if (placedShips.length < SHIP_TYPES.length) {
      toast({ title: 'Plasează toate navele!', status: 'warning' }); return;
    }
    setLoading(true);
    try {
      const flat = placedShips.flatMap(s => s.positions);
      await placeShips(flat);
      setPhase('battle');
      toast({ title: 'Nave plasate!', description: 'Așteptăm adversarul...', status: 'success' });
    } catch (e: any) {
      toast({ title: 'Eroare', description: e.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const remainingShips = SHIP_TYPES.filter(s => !placedShips.some(p => p.shipId === s.id));

  return (
    <Container maxW="container.xl" py={8}>
      {/* LOBBY */}
      {phase === 'lobby' && (
        <VStack spacing={8} align="center">
          <VStack spacing={2} textAlign="center">
            <Heading size="2xl" bgGradient="linear(to-r, blue.400, cyan.400)" bgClip="text">⚓ MetaShipX Battle</Heading>
            <Text color="gray.500" fontSize="lg">Joacă Battleship pe blockchain cu mizare EGLD</Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full" maxW="600px">
            <Box p={6} borderRadius="xl" bg="blue.900" border="1px" borderColor="blue.600" shadow="lg">
              <VStack spacing={4}>
                <Text fontSize="xl" fontWeight="bold" color="white">🎮 Crează Joc</Text>
                <Text color="blue.200" fontSize="sm">Tu ești gazda. Adversarul se alătură cu același pariu.</Text>
                <Box w="full">
                  <Text color="gray.400" fontSize="xs" mb={1}>Pariu (EGLD)</Text>
                  <NumberInput value={betAmount} min={0.01} step={0.1} onChange={v => setBetAmount(v)}>
                    <NumberInputField bg="blue.800" border="blue.600" color="white" />
                  </NumberInput>
                </Box>
                <Button colorScheme="blue" w="full" onClick={handleCreateGame} isLoading={loading}>Crează Joc</Button>
              </VStack>
            </Box>

            <Box p={6} borderRadius="xl" bg="purple.900" border="1px" borderColor="purple.600" shadow="lg">
              <VStack spacing={4}>
                <Text fontSize="xl" fontWeight="bold" color="white">🚪 Alătură-te</Text>
                <Text color="purple.200" fontSize="sm">Introdu ID-ul primit de la adversar.</Text>
                <Box w="full">
                  <Text color="gray.400" fontSize="xs" mb={1}>Game ID</Text>
                  <Input placeholder="ex: game_123" value={joinGameId} onChange={e => setJoinGameId(e.target.value)} bg="purple.800" border="purple.600" color="white" />
                </Box>
                <Box w="full">
                  <Text color="gray.400" fontSize="xs" mb={1}>Pariu (EGLD)</Text>
                  <NumberInput value={betAmount} min={0.01} step={0.1} onChange={v => setBetAmount(v)}>
                    <NumberInputField bg="purple.800" border="purple.600" color="white" />
                  </NumberInput>
                </Box>
                <Button colorScheme="purple" w="full" onClick={handleJoinGame} isLoading={loading} isDisabled={!joinGameId}>Alătură-te</Button>
              </VStack>
            </Box>
          </SimpleGrid>

          {gameId && (
            <Alert status="success" borderRadius="xl" maxW="500px">
              <AlertIcon />
              <Box>
                <AlertTitle>Joc creat cu succes!</AlertTitle>
                <AlertDescription>Trimite ID-ul adversarului: <strong>{gameId}</strong></AlertDescription>
              </Box>
            </Alert>
          )}
        </VStack>
      )}

      {/* PLACEMENT */}
      {phase === 'placement' && (
        <VStack spacing={6}>
          <HStack justify="space-between" w="full">
            <VStack align="start">
              <Heading size="lg">⚓ Plasează Navele</Heading>
              <Text color="gray.500">Selectează o navă, orientarea și click pe board</Text>
            </VStack>
            <HStack>
              <Button variant="outline" size="sm" onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}>
                {orientation === 'horizontal' ? '↔️ Orizontal' : '↕️ Vertical'}
              </Button>
              <Button colorScheme="green" onClick={handleConfirmPlacement} isLoading={loading} isDisabled={placedShips.length < SHIP_TYPES.length}>
                Confirmă ✓
              </Button>
            </HStack>
          </HStack>

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} w="full">
            <Box>
              <Text fontWeight="bold" mb={3} color="cyan.400">🗺️ Tabla Ta</Text>
              <GameBoard
                board={myBoard}
                onCellClick={handleCellClick}
                isInteractive={true}
                label="Plasare nave"
              />
            </Box>
            <VStack align="start" spacing={4}>
              <Text fontWeight="bold" color="yellow.400">🚢 Flota Ta</Text>
              {SHIP_TYPES.map(ship => {
                const placed = placedShips.some(p => p.shipId === ship.id);
                return (
                  <Box
                    key={ship.id}
                    p={3} w="full" borderRadius="lg"
                    bg={placed ? 'green.900' : selectedShip === ship.id ? 'blue.800' : 'gray.800'}
                    border="1px" borderColor={placed ? 'green.600' : selectedShip === ship.id ? 'blue.400' : 'gray.600'}
                    cursor={placed ? 'default' : 'pointer'}
                    onClick={() => !placed && setSelectedShip(ship.id)}
                    opacity={placed ? 0.6 : 1}
                  >
                    <HStack justify="space-between">
                      <HStack>
                        <Text fontSize="xl">{ship.emoji}</Text>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" fontSize="sm" color="white">{ship.name}</Text>
                          <Text fontSize="xs" color="gray.400">{'■'.repeat(ship.size)} ({ship.size} celule)</Text>
                        </VStack>
                      </HStack>
                      <Badge colorScheme={placed ? 'green' : 'gray'}>{placed ? '✓ Plasat' : 'Disponibil'}</Badge>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </SimpleGrid>
        </VStack>
      )}

      {/* BATTLE */}
      {phase === 'battle' && (
        <VStack spacing={6}>
          <HStack justify="space-between" w="full">
            <Heading size="lg">⚔️ Bătălie</Heading>
            <Badge colorScheme={isMyTurn ? 'green' : 'yellow'} fontSize="md" p={2} borderRadius="lg">
              {isMyTurn ? '🎯 Rândul tău — Atacă!' : '⏳ Rândul adversarului...'}
            </Badge>
          </HStack>

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} w="full">
            <Box>
              <Text fontWeight="bold" mb={3} color="red.400">🎯 Tabla Adversarului {isMyTurn && '— Click pentru atac'}</Text>
              <GameBoard
                board={enemyBoard}
                onCellClick={isMyTurn ? handleCellClick : undefined}
                isInteractive={isMyTurn}
                label="Board adversar"
              />
            </Box>
            <Box>
              <Text fontWeight="bold" mb={3} color="cyan.400">🛡️ Tabla Ta</Text>
              <GameBoard
                board={myBoard}
                isInteractive={false}
                label="Board tău"
              />
            </Box>
          </SimpleGrid>

          {loading && (
            <HStack>
              <Spinner color="cyan.400" />
              <Text color="gray.400">Procesare tranzacție...</Text>
            </HStack>
          )}
        </VStack>
      )}

      {/* RESULT */}
      {phase === 'result' && (
        <VStack spacing={8} align="center" py={16}>
          <Text fontSize="6xl">{gameState?.winner === address ? '🏆' : '💀'}</Text>
          <Heading size="2xl" color={gameState?.winner === address ? 'yellow.400' : 'red.400'}>
            {gameState?.winner === address ? 'VICTORIE!' : 'ÎNFRÂNGERE'}
          </Heading>
          <Text color="gray.400" fontSize="lg">
            {gameState?.winner === address
              ? `Ai câștigat ${parseFloat(betAmount) * 2} EGLD!`
              : 'Mai încearcă! Strategia contează.'}
          </Text>
          <HStack spacing={4}>
            <Button colorScheme="blue" size="lg" onClick={() => { setPhase('lobby'); setGameId(null); setMyBoard(Array(100).fill('empty')); setEnemyBoard(Array(100).fill('empty')); setPlacedShips([]); }}>
              🔄 Joc Nou
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/marketplace')}>🛒 Marketplace</Button>
          </HStack>
        </VStack>
      )}
    </Container>
  );
}
