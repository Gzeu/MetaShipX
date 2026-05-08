import React, { useState } from 'react';
import {
  Box, Container, Heading, Text, VStack, HStack, Grid, GridItem,
  Button, Input, InputGroup, InputRightElement, Divider, Badge,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Alert, AlertIcon, Skeleton, Progress, Tooltip, Flex,
  useColorModeValue, useToast, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Tab, Tabs, TabList, TabPanel, TabPanels, Card, CardBody,
} from '@chakra-ui/react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useStaking } from '../../hooks/useStaking';

const APR = 20; // %

export default function StakingPage() {
  const { account } = useGetAccountInfo();
  const toast = useToast();
  const { stakeInfo, pendingRewards, totalStaked, rewardPool, loading, error, stake, unstake, claimRewards } = useStaking();

  const [stakeAmount, setStakeAmount]   = useState('1');
  const [unstakeAmount, setUnstakeAmount] = useState('1');
  const [txPending, setTxPending]       = useState(false);

  const bg      = useColorModeValue('white', 'gray.800');
  const heroBg  = useColorModeValue('blue.600', 'blue.900');
  const statBg  = useColorModeValue('gray.50', 'gray.750');

  const egldStaked   = parseFloat(stakeInfo?.amount  ?? '0');
  const egldPending  = parseFloat(pendingRewards      ?? '0');
  const egldPool     = parseFloat(rewardPool          ?? '0');
  const egldTotal    = parseFloat(totalStaked         ?? '0');
  const yearlyEarning = egldStaked * (APR / 100);

  async function handleStake() {
    if (!account?.address) return;
    setTxPending(true);
    try {
      await stake(account.address, stakeAmount);
      toast({ title: `Staked ${stakeAmount} EGLD`, status: 'success', duration: 4000 });
    } catch (e: any) {
      toast({ title: 'Stake failed', description: e?.message, status: 'error', duration: 5000 });
    } finally { setTxPending(false); }
  }

  async function handleUnstake() {
    if (!account?.address) return;
    setTxPending(true);
    try {
      await unstake(account.address, unstakeAmount);
      toast({ title: `Unstaked ${unstakeAmount} EGLD`, status: 'success', duration: 4000 });
    } catch (e: any) {
      toast({ title: 'Unstake failed', description: e?.message, status: 'error', duration: 5000 });
    } finally { setTxPending(false); }
  }

  async function handleClaim() {
    if (!account?.address) return;
    setTxPending(true);
    try {
      await claimRewards(account.address);
      toast({ title: `Claimed ${egldPending.toFixed(4)} EGLD`, status: 'success', duration: 4000 });
    } catch (e: any) {
      toast({ title: 'Claim failed', description: e?.message, status: 'error', duration: 5000 });
    } finally { setTxPending(false); }
  }

  return (
    <Box>
      {/* Hero */}
      <Box bg={heroBg} color="white" py={{ base: 10, md: 16 }} px={4} textAlign="center">
        <Container maxW="container.md">
          <Text fontSize="4xl" mb={2}>⚓</Text>
          <Heading size={{ base: 'xl', md: '2xl' }} mb={3}>Fleet Staking</Heading>
          <Text color="whiteAlpha.800" maxW="460px" mx="auto">
            Stake EGLD, earn {APR}% APR from game fees. Rewards accumulate every second.
          </Text>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        {error && <Alert status="error" mb={4} borderRadius="lg"><AlertIcon />{error}</Alert>}

        {/* Global stats */}
        <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={4} mb={8}>
          {[
            { label: 'Total Staked',  value: `${egldTotal.toFixed(2)} EGLD`, icon: '🔒' },
            { label: 'Reward Pool',   value: `${egldPool.toFixed(2)} EGLD`,  icon: '💰' },
            { label: 'Current APR',   value: `${APR}%`,                       icon: '📈' },
            { label: 'Your Rewards',  value: `${egldPending.toFixed(4)} EGLD`, icon: '🎁' },
          ].map(s => (
            <Skeleton key={s.label} isLoaded={!loading} borderRadius="xl">
              <Box bg={statBg} borderRadius="xl" p={5} border="1px" borderColor={useColorModeValue('gray.200','gray.700')}>
                <Text fontSize="xl" mb={1}>{s.icon}</Text>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">{s.label}</Text>
                <Text fontSize="xl" fontWeight="bold" mt={1}>{s.value}</Text>
              </Box>
            </Skeleton>
          ))}
        </Grid>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8}>
          {/* Left — Actions */}
          <Box>
            <Tabs colorScheme="blue" variant="soft-rounded">
              <TabList mb={4} gap={2}>
                <Tab>⬆️ Stake</Tab>
                <Tab>⬇️ Unstake</Tab>
              </TabList>
              <TabPanels>
                {/* Stake */}
                <TabPanel px={0}>
                  <Box bg={bg} borderRadius="xl" p={6} border="1px" borderColor={useColorModeValue('gray.200','gray.700')}>
                    <Text fontSize="sm" color="gray.500" mb={1}>Amount (EGLD)</Text>
                    <NumberInput min={0.001} step={0.1} value={stakeAmount} onChange={setStakeAmount} mb={4}>
                      <NumberInputField borderRadius="lg" fontSize="lg" fontWeight="semibold" />
                      <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                    <HStack justify="space-between" mb={4} fontSize="sm" color="gray.500">
                      <Text>Yearly earning</Text>
                      <Text fontWeight="semibold" color="green.400">
                        +{(parseFloat(stakeAmount || '0') * APR / 100).toFixed(4)} EGLD
                      </Text>
                    </HStack>
                    <Button
                      colorScheme="blue" w="full" size="lg" borderRadius="lg"
                      isLoading={txPending} onClick={handleStake}
                    >
                      Stake EGLD
                    </Button>
                  </Box>
                </TabPanel>

                {/* Unstake */}
                <TabPanel px={0}>
                  <Box bg={bg} borderRadius="xl" p={6} border="1px" borderColor={useColorModeValue('gray.200','gray.700')}>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color="gray.500">Amount (EGLD)</Text>
                      <Button size="xs" variant="ghost" onClick={() => setUnstakeAmount(String(egldStaked))}>Max</Button>
                    </HStack>
                    <NumberInput min={0.001} max={egldStaked} step={0.1} value={unstakeAmount} onChange={setUnstakeAmount} mb={4}>
                      <NumberInputField borderRadius="lg" fontSize="lg" fontWeight="semibold" />
                      <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                    <Progress
                      value={(parseFloat(unstakeAmount || '0') / Math.max(egldStaked, 0.001)) * 100}
                      colorScheme="orange" size="sm" borderRadius="full" mb={4}
                    />
                    <Button
                      colorScheme="orange" w="full" size="lg" borderRadius="lg"
                      isLoading={txPending} onClick={handleUnstake}
                    >
                      Unstake EGLD
                    </Button>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>

          {/* Right — My position */}
          <Box>
            <Skeleton isLoaded={!loading} borderRadius="xl">
              <Box bg={bg} borderRadius="xl" p={6} border="1px" borderColor={useColorModeValue('gray.200','gray.700')} h="full">
                <Heading size="sm" mb={5}>📊 My Position</Heading>

                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between">
                    <Text color="gray.500">Staked</Text>
                    <Text fontWeight="bold">{egldStaked.toFixed(4)} EGLD</Text>
                  </Flex>
                  <Divider />
                  <Flex justify="space-between">
                    <Text color="gray.500">Pending Rewards</Text>
                    <Text fontWeight="bold" color="green.400">{egldPending.toFixed(6)} EGLD</Text>
                  </Flex>
                  <Divider />
                  <Flex justify="space-between">
                    <Text color="gray.500">Yearly Earning</Text>
                    <Text fontWeight="bold" color="blue.400">+{yearlyEarning.toFixed(4)} EGLD</Text>
                  </Flex>
                  <Divider />
                  <Flex justify="space-between">
                    <Text color="gray.500">Pool Share</Text>
                    <Text fontWeight="bold">
                      {egldTotal > 0 ? ((egldStaked / egldTotal) * 100).toFixed(2) : '0.00'}%
                    </Text>
                  </Flex>

                  <Progress
                    value={egldTotal > 0 ? (egldStaked / egldTotal) * 100 : 0}
                    colorScheme="blue" size="sm" borderRadius="full"
                  />

                  <Button
                    colorScheme="green" w="full" size="lg" borderRadius="lg"
                    isLoading={txPending}
                    isDisabled={egldPending < 0.000001}
                    onClick={handleClaim}
                  >
                    🎁 Claim {egldPending.toFixed(4)} EGLD
                  </Button>

                  {stakeInfo?.since && (
                    <Text fontSize="xs" color="gray.400" textAlign="center">
                      Staking since block #{stakeInfo.since}
                    </Text>
                  )}
                </VStack>
              </Box>
            </Skeleton>
          </Box>
        </Grid>

        {/* Info box */}
        <Box mt={8} bg={statBg} borderRadius="xl" p={6} border="1px" borderColor={useColorModeValue('gray.200','gray.700')}>
          <Heading size="sm" mb={3}>ℹ️ How it works</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3,1fr)' }} gap={4}>
            {[
              { step: '1', title: 'Stake EGLD', desc: 'Lock your EGLD in the reward pool contract.' },
              { step: '2', title: 'Earn Rewards', desc: `${APR}% APR distributed from game entry fees, compounding every second.` },
              { step: '3', title: 'Claim Anytime', desc: 'Withdraw rewards or unstake at any time with no lock period.' },
            ].map(item => (
              <HStack key={item.step} align="start" spacing={3}>
                <Box
                  bg="blue.500" color="white" borderRadius="full"
                  w={7} h={7} display="flex" alignItems="center" justifyContent="center"
                  flexShrink={0} fontWeight="bold" fontSize="sm"
                >{item.step}</Box>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">{item.title}</Text>
                  <Text fontSize="xs" color="gray.500">{item.desc}</Text>
                </Box>
              </HStack>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
