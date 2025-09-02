import { Box, Button, Container, Flex, Heading, Text, VStack } from '@chakra-ui/react';

const GamePage = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={8}>Battleship Game</Heading>
      
      <Box borderWidth="1px" borderRadius="lg" p={6} mb={8}>
        <Text>Game board will be displayed here</Text>
        {/* Game board component will go here */}
      </Box>
      
      <Flex justify="space-between" wrap="wrap" gap={4}>
        <Box flex={1} minW="300px">
          <Heading size="md" mb={4}>Your Fleet</Heading>
          {/* Ship selection and placement UI will go here */}
          <Text>Your ships will appear here</Text>
        </Box>
        
        <Box flex={1} minW="300px">
          <Heading size="md" mb={4}>Game Log</Heading>
          <Box 
            borderWidth="1px" 
            borderRadius="md" 
            p={4} 
            h="200px" 
            overflowY="auto"
            bg="blackAlpha.50"
          >
            <Text>Game events will appear here</Text>
          </Box>
        </Box>
      </Flex>
      
      <Flex mt={8} gap={4} justify="flex-end">
        <Button colorScheme="gray" variant="outline">
          Surrender
        </Button>
        <Button colorScheme="blue">
          Ready to Play
        </Button>
      </Flex>
    </Container>
  );
};

export default GamePage;
