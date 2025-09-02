import { Box, Button, Container, Flex, Heading, Progress, Stack, Text, VStack } from '@chakra-ui/react';

const StakingPage = () => {
  // Mock data
  const stakedAmount = 100;
  const totalStaked = 10000;
  const apy = 25.5;
  const rewards = 15.75;

  return (
    <Container maxW="container.md" py={8}>
      <Heading as="h1" size="xl" mb={8}>Staking Dashboard</Heading>
      
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8} mb={8}>
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6}
          bg={useColorModeValue('white', 'gray.800')}
        >
          <Text fontSize="lg" fontWeight="medium" mb={4}>Your Staked Ships</Text>
          <VStack spacing={4} align="stretch">
            {[1, 2, 3].map((ship) => (
              <Flex 
                key={ship} 
                justify="space-between" 
                align="center" 
                p={3} 
                borderWidth="1px" 
                borderRadius="md"
              >
                <Text>Ship #{ship}</Text>
                <Button size="sm" colorScheme="red" variant="outline">Unstake</Button>
              </Flex>
            ))}
          </VStack>
        </Box>
        
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6}
          bg={useColorModeValue('white', 'gray.800')}
        >
          <Text fontSize="lg" fontWeight="medium" mb={4}>Staking Pool</Text>
          <VStack spacing={4} align="stretch">
            <Box>
              <Flex justify="space-between" mb={1}>
                <Text>Total Staked:</Text>
                <Text fontWeight="medium">{totalStaked.toLocaleString()} SHIP</Text>
              </Flex>
              <Progress value={stakedAmount / totalStaked * 100} size="sm" borderRadius="full" />
            </Box>
            
            <Box>
              <Text>APY:</Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">{apy}%</Text>
            </Box>
            
            <Box>
              <Text>Your Rewards:</Text>
              <Text fontSize="2xl" fontWeight="bold" color="brand.500">{rewards} EGLD</Text>
            </Box>
            
            <Button colorScheme="brand" mt={4} w="full">
              Claim Rewards
            </Button>
          </VStack>
        </Box>
      </Grid>
      
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        p={6}
        bg={useColorModeValue('white', 'gray.800')}
      >
        <Heading size="md" mb={4}>Stake Your Ships</Heading>
        <Text mb={4} color={useColorModeValue('gray.600', 'gray.300')}>
          Select ships from your collection to stake and start earning rewards.
        </Text>
        
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mt={6}>
          {[4, 5, 6].map((ship) => (
            <Box 
              key={ship}
              borderWidth="1px" 
              borderRadius="md" 
              p={4}
              textAlign="center"
              _hover={{ borderColor: 'brand.500', cursor: 'pointer' }}
            >
              <Box h="100px" bg="gray.100" mb={2} borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                <Text color="gray.500">Ship #{ship}</Text>
              </Box>
              <Text fontSize="sm" mb={2}>Ship Name {ship}</Text>
              <Button size="sm" colorScheme="brand" w="full">Stake</Button>
            </Box>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default StakingPage;
