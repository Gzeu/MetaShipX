import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Button, Select, Badge,
  Grid, GridItem, Heading, Container, Alert, AlertIcon, AlertTitle,
  AlertDescription, Progress, useToast,
} from '@chakra-ui/react';
import {
  createBotState, getNextAttack, recordAttackResult,
  type BotState, type Difficulty, type CellState,
} from '../services/ai-bot.service';
import { EMPTY_BOARD, canPlace, applyAttack } from '../utils/board';

const SHIP_FLEET = [
  { name: 'Carrier', size: 5, color: 'orange' },
  { name: 'Battleship', size: 4, color: 'purple' },
  { name: 'Cruiser', size: 3, color: 'blue' },
  { name: 'Submarine', size: 3, color: 'green' },
  { name: 'Destroyer', size: 2, color: 'gray' },
];

type Phase = 'placement' | 'battle' | 'over';

interface BoardCell {
  state: CellState | 'ship';
}

function emptyPlayerBoard(): BoardCell[][] {
  return Array.from({ length: 10 }, () => Array(10).fill({ state: 'empty' }));
}

export default function PracticeModePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [phase, setPhase] = useState<Phase>('placement');
  const [playerBoard, setPlayerBoard] = useState<BoardCell[][]>(emptyPlayerBoard());
  const [botBoard, setBotBoard] = useState<BoardCell[][]>(emptyPlayerBoard());
  const [botState, setBotState] = useState<BotState>(createBotState('medium'));
  const [shipIndex, setShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'bot'>('player');
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);
  const [statusMsg, setStatusMsg] = useState('Place your ships to begin!');
  const toast = useToast();

  // Auto-place bot ships randomly on start
  const [botShipCells, setBotShipCells] = useState<Set<string>>(new Set());

  const autoPlaceBotShips = useCallback(() => {
    const cells = new Set<string>();
    for (const ship of SHIP_FLEET) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 1000) {
        attempts++;
        const horiz = Math.random() > 0.5;
        const r = Math.floor(Math.random() * (horiz ? 10 : 10 - ship.size + 1));
        const c = Math.floor(Math.random() * (horiz ? 10 - ship.size + 1 : 10));
        const shipCells: [number, number][] = Array.from({ length: ship.size }, (_, i) =>
          horiz ? [r, c + i] : [r + i, c]
        );
        const conflict = shipCells.some(([sr, sc]) => cells.has(`${sr},${sc}`));
        if (!conflict) {
          shipCells.forEach(([sr, sc]) => cells.add(`${sr},${sc}`));
          placed = true;
        }
      }
    }
    setBotShipCells(cells);
  }, []);

  useEffect(() => { autoPlaceBotShips(); }, [autoPlaceBotShips]);

  const handlePlayerBoardClick = (r: number, c: number) => {
    if (phase !== 'placement') return;
    const ship = SHIP_FLEET[shipIndex];
    if (!ship) return;
    const cells: [number, number][] = Array.from({ length: ship.size }, (_, i) =>
      isHorizontal ? [r, c + i] : [r + i, c]
    );
    if (cells.some(([sr, sc]) => sr >= 10 || sc >= 10)) {
      toast({ title: 'Out of bounds!', status: 'warning', duration: 2000 });
      return;
    }
    const conflict = cells.some(([sr, sc]) => playerBoard[sr][sc].state === 'ship');
    if (conflict) {
      toast({ title: 'Overlap!', status: 'warning', duration: 2000 });
      return;
    }
    const newBoard = playerBoard.map(row => row.map(cell => ({ ...cell })));
    cells.forEach(([sr, sc]) => { newBoard[sr][sc] = { state: 'ship' }; });
    setPlayerBoard(newBoard);
    const nextIdx = shipIndex + 1;
    if (nextIdx >= SHIP_FLEET.length) {
      setPhase('battle');
      setStatusMsg('All ships placed! Your turn — attack the enemy grid.');
      setBotState(createBotState(difficulty));
    } else {
      setShipIndex(nextIdx);
      setStatusMsg(`Place your ${SHIP_FLEET[nextIdx].name} (${SHIP_FLEET[nextIdx].size} cells)`);
    }
  };

  const handleBotBoardClick = useCallback(async (r: number, c: number) => {
    if (phase !== 'battle' || currentTurn !== 'player') return;
    if (botBoard[r][c].state !== 'empty') return;

    const isHit = botShipCells.has(`${r},${c}`);
    const newBotBoard = botBoard.map(row => row.map(cell => ({ ...cell })));
    newBotBoard[r][c] = { state: isHit ? 'hit' : 'miss' };
    setBotBoard(newBotBoard);

    const hits = newBotBoard.flat().filter(cell => cell.state === 'hit').length;
    if (hits >= 17) { // 5+4+3+3+2
      setWinner('player');
      setPhase('over');
      setStatusMsg('🎉 You WIN! Enemy fleet destroyed!');
      return;
    }

    setStatusMsg(isHit ? '💥 HIT! Bot is thinking...' : '💦 Miss. Bot is thinking...');
    setCurrentTurn('bot');

    // Bot turn
    setTimeout(() => {
      setBotState(prev => {
        const [br, bc] = getNextAttack(prev);
        const botIsHit = playerBoard[br][bc].state === 'ship';
        const result = botIsHit ? 'hit' : 'miss';
        const next = recordAttackResult(prev, br, bc, result);
        next.attacked.add(`${br},${bc}`);

        setPlayerBoard(pb => {
          const nb = pb.map(row => row.map(cell => ({ ...cell })));
          nb[br][bc] = { state: result };
          const botHits = nb.flat().filter(cell => cell.state === 'hit').length;
          if (botHits >= 17) {
            setWinner('bot');
            setPhase('over');
            setStatusMsg('💀 Bot wins! Your fleet was destroyed.');
          } else {
            setStatusMsg(botIsHit ? `Bot HIT [${br},${bc}]! Your turn.` : `Bot missed [${br},${bc}]. Your turn.`);
            setCurrentTurn('player');
          }
          return nb;
        });
        return next;
      });
    }, 800);
  }, [phase, currentTurn, botBoard, botShipCells, playerBoard]);

  const resetGame = () => {
    setPhase('placement');
    setPlayerBoard(emptyPlayerBoard());
    setBotBoard(emptyPlayerBoard());
    setShipIndex(0);
    setIsHorizontal(true);
    setCurrentTurn('player');
    setWinner(null);
    setStatusMsg('Place your ships to begin!');
    autoPlaceBotShips();
  };

  const getCellColor = (cell: BoardCell, isPlayerBoard: boolean): string => {
    if (cell.state === 'ship' && isPlayerBoard) return 'blue.600';
    if (cell.state === 'hit') return 'red.500';
    if (cell.state === 'miss') return 'gray.600';
    return 'gray.800';
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6}>
        <Heading color="cyan.300" size="xl">⚓ Practice Mode <Badge colorScheme="green" ml={2}>FREE</Badge></Heading>
        <Text color="gray.400">No NFT required · No EGLD wager · Perfect for learning</Text>

        {phase === 'placement' && (
          <HStack spacing={4}>
            <Select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty)}
              bg="gray.800" color="white" borderColor="gray.600" w="180px"
            >
              <option value="easy">🟢 Easy (Random)</option>
              <option value="medium">🟡 Medium (Hunt/Target)</option>
              <option value="hard">🔴 Hard (Probability Map)</option>
            </Select>
            <Button
              size="sm" colorScheme="gray"
              onClick={() => setIsHorizontal(h => !h)}
            >
              Rotate: {isHorizontal ? '→ Horizontal' : '↓ Vertical'}
            </Button>
          </HStack>
        )}

        <Alert status={winner === 'player' ? 'success' : winner === 'bot' ? 'error' : 'info'} borderRadius="md">
          <AlertIcon />
          <AlertTitle>{statusMsg}</AlertTitle>
          {phase === 'placement' && shipIndex < SHIP_FLEET.length && (
            <AlertDescription>Placing: <strong>{SHIP_FLEET[shipIndex].name}</strong> ({SHIP_FLEET[shipIndex].size} cells)</AlertDescription>
          )}
        </Alert>

        <HStack spacing={8} align="flex-start" flexWrap="wrap" justify="center">
          {/* Player Board */}
          <VStack>
            <Text color="cyan.300" fontWeight="bold">Your Fleet</Text>
            <Grid templateColumns="repeat(10, 36px)" gap={1}>
              {playerBoard.map((row, r) =>
                row.map((cell, c) => (
                  <GridItem
                    key={`p-${r}-${c}`}
                    w="36px" h="36px"
                    bg={getCellColor(cell, true)}
                    border="1px solid"
                    borderColor="gray.700"
                    cursor={phase === 'placement' ? 'pointer' : 'default'}
                    _hover={phase === 'placement' ? { bg: 'blue.400', opacity: 0.8 } : {}}
                    onClick={() => handlePlayerBoardClick(r, c)}
                    borderRadius="2px"
                  />
                ))
              )}
            </Grid>
          </VStack>

          {/* Bot Board */}
          <VStack>
            <Text color="red.300" fontWeight="bold">Enemy Grid</Text>
            <Grid templateColumns="repeat(10, 36px)" gap={1}>
              {botBoard.map((row, r) =>
                row.map((cell, c) => (
                  <GridItem
                    key={`b-${r}-${c}`}
                    w="36px" h="36px"
                    bg={getCellColor(cell, false)}
                    border="1px solid"
                    borderColor="gray.700"
                    cursor={phase === 'battle' && currentTurn === 'player' && cell.state === 'empty' ? 'crosshair' : 'default'}
                    _hover={phase === 'battle' && currentTurn === 'player' && cell.state === 'empty' ? { bg: 'yellow.500', opacity: 0.7 } : {}}
                    onClick={() => handleBotBoardClick(r, c)}
                    borderRadius="2px"
                  />
                ))
              )}
            </Grid>
          </VStack>
        </HStack>

        {phase === 'over' && (
          <Button colorScheme="cyan" size="lg" onClick={resetGame}>🔄 Play Again</Button>
        )}
      </VStack>
    </Container>
  );
}
