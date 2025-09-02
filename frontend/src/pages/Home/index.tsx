import { Box, Button, Container, Flex, Heading, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useDapp } from '../../contexts/DappProvider';

const Home = () => {
  const { isLoggedIn } = useDapp();
  const bgGradient = useColorModeValue(
    'linear(to-r, brand.50, brand.100)',
    'linear(to-r, gray.800, brand.900)'
  );

  return (
    <Box>
      {/* Hero Section */}
      <Box bgGradient={bgGradient} py={20} mb={16}>
        <Container maxW="container.lg">
          <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={12}>
            <Box flex={1}>
              <Heading as="h1" size="2xl" mb={6} color="white">
                Battle on the Blockchain
              </Heading>
              <Text fontSize="xl" mb={8} color="whiteAlpha.900">
                Experience the classic game of Battleship with Web3 technology. 
                Play, earn, and collect unique NFT ships in this exciting multiplayer experience.
              </Text>
              <Flex gap={4}>
                {!isLoggedIn ? (
                  <Button as={RouterLink} to="/game" colorScheme="white" variant="outline" size="lg">
                    Play as Guest
                  </Button>
                ) : (
                  <Button as={RouterLink} to="/game" colorScheme="white" variant="outline" size="lg">
                    Play Now
                  </Button>
                )}
                <Button as={RouterLink} to="/marketplace" colorScheme="white" variant="ghost" size="lg">
                  Explore Marketplace
                </Button>
              </Flex>
            </Box>
            <Box flex={1} display={{ base: 'none', md: 'block' }}>
              {/* Placeholder for game preview image */}
              <Box 
                bg="blackAlpha.200" 
                h="400px" 
                borderRadius="xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="whiteAlpha.700" fontSize="lg">Game Preview</Text>
              </Box>
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxW="container.lg" mb={20}>
        <Heading as="h2" size="xl" textAlign="center" mb={12}>
          Why Play MetaShipX?
        </Heading>
        
        <Flex direction={{ base: 'column', md: 'row' }} gap={8}>
          {[
            {
              title: 'Play to Earn',
              description: 'Earn cryptocurrency and NFTs by playing and winning battles.',
              emoji: '💰',
            },
            {
              title: 'NFT Ships',
              description: 'Collect and upgrade unique NFT ships with special abilities.',
              emoji: '🚢',
            },
            {
              title: 'Decentralized',
              description: 'Fully on-chain gameplay with provably fair mechanics.',
              emoji: '🔗',
            },
          ].map((feature, index) => (
            <Box 
              key={index} 
              flex={1} 
              p={6} 
              borderRadius="xl" 
              borderWidth="1px"
              borderColor={useColorModeValue('gray.200', 'gray.700')}
              _hover={{
                transform: 'translateY(-4px)',
                boxShadow: 'lg',
                transition: 'all 0.2s',
              }}
            >
              <Text fontSize="4xl" mb={4}>
                {feature.emoji}
              </Text>
              <Heading as="h3" size="md" mb={2}>
                {feature.title}
              </Heading>
              <Text color={useColorModeValue('gray.600', 'gray.400')}>
                {feature.description}
              </Text>
            </Box>
          ))}
        </Flex>
      </Container>

      {/* Call to Action */}
      <Box bg={useColorModeValue('gray.50', 'gray.800')} py={16}>
        <Container maxW="container.md" textAlign="center">
          <Heading as="h2" size="xl" mb={6}>
            Ready to Start Your Adventure?
          </Heading>
          <Text fontSize="lg" mb={8} color={useColorModeValue('gray.600', 'gray.300')}>
            Join thousands of players in the ultimate blockchain battleship experience.
          </Text>
          <Button 
            as={RouterLink} 
            to={isLoggedIn ? "/game" : "/"} 
            colorScheme="brand" 
            size="lg"
            onClick={() => {
              if (!isLoggedIn) {
                // Trigger wallet connect
                const connectBtn = document.querySelector('button[aria-label="Connect"]') as HTMLButtonElement;
                if (connectBtn) {
                  connectBtn.click();
                }
              }
            }}
          >
            {isLoggedIn ? 'Play Now' : 'Connect Wallet to Start'}
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
