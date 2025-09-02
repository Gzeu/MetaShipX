import { Box, Button, Container, Flex, Grid, Heading, Text, VStack } from '@chakra-ui/react';

const MarketplacePage = () => {
  // Mock data for marketplace items
  const nfts = [
    { id: 1, name: 'Battleship Alpha', price: '10', rarity: 'Rare', image: '' },
    { id: 2, name: 'Destroyer Beta', price: '5', rarity: 'Common', image: '' },
    { id: 3, name: 'Cruiser Gamma', price: '8', rarity: 'Uncommon', image: '' },
    { id: 4, name: 'Submarine Delta', price: '12', rarity: 'Rare', image: '' },
  ];

  return (
    <Container maxW="container.xl" py={8}>
      <Flex justify="space-between" align="center" mb={8}>
        <Heading as="h1" size="xl">NFT Marketplace</Heading>
        <Button colorScheme="brand">List New Ship</Button>
      </Flex>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
        {nfts.map((nft) => (
          <Box 
            key={nft.id}
            borderWidth="1px" 
            borderRadius="lg" 
            overflow="hidden"
            _hover={{ transform: 'translateY(-4px)', shadow: 'lg' }}
            transition="all 0.2s"
          >
            <Box h="200px" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
              <Text>NFT Image</Text>
            </Box>
            <Box p={4}>
              <Flex justify="space-between" mb={2}>
                <Text fontWeight="bold">{nft.name}</Text>
                <Text color="brand.500" fontWeight="bold">{nft.price} EGLD</Text>
              </Flex>
              <Text fontSize="sm" color="gray.500" mb={4}>{nft.rarity}</Text>
              <Button w="full" colorScheme="brand" size="sm">
                Buy Now
              </Button>
            </Box>
          </Box>
        ))}
      </Grid>
    </Container>
  );
};

export default MarketplacePage;
