import { useState } from 'react';
import {
  Box, Container, VStack, HStack, Heading, Text, Button,
  SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  useToast, Spinner, Alert, AlertIcon, Progress,
  Divider, Flex, Badge, Tabs, TabList, Tab, TabPanels, TabPanel,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Input, InputGroup, InputRightAddon,
  CircularProgress, CircularProgressLabel,
} from '@chakra-ui/react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { useStaking } from '../hooks/useStaking';

function StatCard({ label, value, sub, color = 'white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Box p={5} borderRadius="xl" bg="gray.800" border="1px" borderColor="gray.700" shadow="md">
      <Stat>
        <StatLabel color="gray.400" fontSize="sm">{label}</StatLabel>
        <StatNumber color={color} fontSize="2xl">{value}</StatNumber>
        {sub && <StatHelpText color="gray.500" mb={0}>{sub}</StatHelpText>}
      </Stat>
    </Box>
  );
}

export default function StakingPage() {
  const { address } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();
  const toast = useToast();

  const { stakeInfo, pendingRewards, totalStaked, rewardPool, apr, stake, unstake, claimRewards, isLoading, refetch } = useStaking();

  const [stakeAmount, setStakeAmount] = useState('1');
  const [unstakeAmount, setUnstakeAmount] = useState('1');
  const [txLoading, setTxLoading] = useState(false);

  const egldStaked = stakeInfo ? (Number(stakeInfo.amount) / 1e18).toFixed(4) : '0';
  const egldPending = pendingRewards ? (Number(pendingRewards) / 1e18).toFixed(6) : '0';
  const egldTotal = totalStaked ? (Number(totalStaked) / 1e18).toFixed(2) : '0';
  const egldPool = rewardPool ? (Number(rewardPool) / 1e18).toFixed(2) : '0';
  const aprValue = apr ? (Number(apr) / 100).toFixed(1) : '20.0';
  const poolUsage = rewardPool && totalStaked ? Math.min(100, (Number(totalStaked) / Number(rewardPool)) * 100) : 0;

  const doStake = async () => {
    setTxLoading(true);
    try {
      await stake(stakeAmount);
      toast({ title: '✅ Stake trimis!', description: `${stakeAmount} EGLD staked`, status: 'success' });
      await refetch();
    } catch (e: any) {
      toast({ title: 'Eroare stake', description: e.message, status: 'error' });
    } finally { setTxLoading(false); }
  };

  const doUnstake = async () => {
    setTxLoading(true);
    try {
      await unstake(unstakeAmount);
      toast({ title: '✅ Unstake trimis!', description: `${unstakeAmount} EGLD returnat`, status: 'success' });
      await refetch();
    } catch (e: any) {
      toast({ title: 'Eroare unstake', description: e.message, status: 'error' });
    } finally { setTxLoading(false); }
  };

  const doClaim = async () => {
    setTxLoading(true);
    try {
      await claimRewards();
      toast({ title: '🎉 Rewards claimed!', description: `${egldPending} EGLD primit`, status: 'success' });
      await refetch();
    } catch (e: any) {
      toast({ title: 'Eroare claim', description: e.message, status: 'error' });
    } finally { setTxLoading(false); }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="xl" bgGradient="linear(to-r, green.300, teal.400)" bgClip="text">💎 Staking Pool</Heading>
            <Text color="gray.400">Stakează EGLD, câștigă recompense din meciuri</Text>
          </VStack>
          <Badge colorScheme="green" fontSize="xl" p={3} borderRadius="lg">
            APR {aprValue}%
          </Badge>
        </HStack>

        {/* Stats Grid */}
        {isLoading ? (
          <Flex justify="center" py={8}><Spinner color="green.400" size="xl" /></Flex>
        ) : (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <StatCard label="Staked de tine" value={`${egldStaked} EGLD`} color="cyan.300" />
            <StatCard label="Rewards disponibile" value={`${egldPending} EGLD`} color="yellow.300" />
            <StatCard label="Total staked (global)" value={`${egldTotal} EGLD`} color="green.300" />
            <StatCard label="Reward Pool" value={`${egldPool} EGLD`} color="purple.300" />
          </SimpleGrid>
        )}

        {/* Pool health */}
        <Box p={5} borderRadius="xl" bg="gray.800" border="1px" borderColor="gray.700">
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="bold" color="gray.300">Sănătate Pool</Text>
            <Text color="gray.400" fontSize="sm">{poolUsage.toFixed(1)}% utilizat</Text>
          </HStack>
          <Progress value={poolUsage} colorScheme={poolUsage > 80 ? 'red' : poolUsage > 50 ? 'yellow' : 'green'} borderRadius="full" />
          <Text color="gray.500" fontSize="xs" mt={2}>Pool-ul e alimentat din taxele meciurilor. Sub 20% → APR poate scădea.</Text>
        </Box>

        {/* Actions */}
        <Tabs variant="enclosed" colorScheme="green">
          <TabList>
            <Tab>📥 Stake</Tab>
            <Tab>📤 Unstake</Tab>
            <Tab>🎁 Claim Rewards</Tab>
          </TabList>
          <TabPanels>
            {/* STAKE */}
            <TabPanel>
              <Box maxW="400px">
                <VStack spacing={4} align="stretch">
                  <Text color="gray.400">Intră în pool și începe să câștigi {aprValue}% APR pe EGLD-ul tău.</Text>
                  <Box>
                    <Text color="gray.400" fontSize="sm" mb={1}>Sumă EGLD</Text>
                    <NumberInput value={stakeAmount} min={0.01} step={0.1} onChange={v => setStakeAmount(v)}>
                      <NumberInputField bg="gray.900" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Box>
                  <Alert status="info" borderRadius="lg" bg="blue.900">
                    <AlertIcon />
                    <Text fontSize="sm">Estimat per an: <strong>{(parseFloat(stakeAmount || '0') * parseFloat(aprValue) / 100).toFixed(4)} EGLD</strong></Text>
                  </Alert>
                  <Button colorScheme="green" size="lg" onClick={doStake} isLoading={txLoading} isDisabled={!isLoggedIn}>
                    💎 Stakează {stakeAmount} EGLD
                  </Button>
                </VStack>
              </Box>
            </TabPanel>

            {/* UNSTAKE */}
            <TabPanel>
              <Box maxW="400px">
                <VStack spacing={4} align="stretch">
                  <Text color="gray.400">Ai staked: <strong color="cyan">{egldStaked} EGLD</strong>. Poți retrage oricând.</Text>
                  <Box>
                    <Text color="gray.400" fontSize="sm" mb={1}>Sumă de retras</Text>
                    <NumberInput value={unstakeAmount} min={0.01} max={parseFloat(egldStaked)} step={0.1} onChange={v => setUnstakeAmount(v)}>
                      <NumberInputField bg="gray.900" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Box>
                  <Button
                    variant="outline" colorScheme="yellow" size="sm"
                    onClick={() => setUnstakeAmount(egldStaked)}
                  >Max ({egldStaked} EGLD)</Button>
                  <Alert status="warning" borderRadius="lg" bg="yellow.900">
                    <AlertIcon />
                    <Text fontSize="sm">Rewards acumulate vor fi auto-claimed la unstake.</Text>
                  </Alert>
                  <Button colorScheme="orange" size="lg" onClick={doUnstake} isLoading={txLoading} isDisabled={!isLoggedIn || parseFloat(egldStaked) === 0}>
                    📤 Retrage {unstakeAmount} EGLD
                  </Button>
                </VStack>
              </Box>
            </TabPanel>

            {/* CLAIM */}
            <TabPanel>
              <Box maxW="400px">
                <VStack spacing={6} align="center">
                  <CircularProgress value={parseFloat(egldPending) > 0 ? 100 : 0} color="yellow.300" size="120px" thickness="8px">
                    <CircularProgressLabel>
                      <VStack spacing={0}>
                        <Text fontSize="xs" color="gray.400">Rewards</Text>
                        <Text fontWeight="bold" color="yellow.300" fontSize="sm">{egldPending}</Text>
                        <Text fontSize="xs" color="gray.400">EGLD</Text>
                      </VStack>
                    </CircularProgressLabel>
                  </CircularProgress>
                  <Text color="gray.400" textAlign="center">
                    Rewards se acumulează în timp real bazat pe EGLD staked și APR de {aprValue}%.
                  </Text>
                  <Button
                    colorScheme="yellow" size="lg" w="full"
                    onClick={doClaim}
                    isLoading={txLoading}
                    isDisabled={!isLoggedIn || parseFloat(egldPending) === 0}
                  >
                    🎁 Claim {egldPending} EGLD
                  </Button>
                </VStack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* How it works */}
        <Box p={6} borderRadius="xl" bg="gray.900" border="1px" borderColor="gray.700">
          <Heading size="sm" color="gray.300" mb={4">⚙️ Cum funcționează</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {[
              { step: '1', title: 'Stakează EGLD', desc: 'Depune EGLD în pool. Nu există lock-up.' },
              { step: '2', title: 'Câștigă Rewards', desc: `${aprValue}% APR distribuit din taxele meciurilor de battleship.` },
              { step: '3', title: 'Claim oricând', desc: 'Retrage rewards sau unstake fără penalizare.' },
            ].map(({ step, title, desc }) => (
              <HStack key={step} align="start" spacing={3}>
                <Flex minW="32px" h="32px" borderRadius="full" bg="green.800" justify="center" align="center">
                  <Text fontWeight="bold" color="green.300">{step}</Text>
                </Flex>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold" color="white">{title}</Text>
                  <Text color="gray.400" fontSize="sm">{desc}</Text>
                </VStack>
              </HStack>
            ))}
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  );
}
