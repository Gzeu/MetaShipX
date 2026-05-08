import React from 'react';
import { Box, Container, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="container.sm" textAlign="center">
        <VStack spacing={6}>
          <Text fontSize="7xl">🌊</Text>
          <Heading size="2xl">404</Heading>
          <Heading size="md" color="gray.500">Page lost at sea</Heading>
          <Text color="gray.400">The page you're looking for has sunk to the bottom of the ocean.</Text>
          <Button colorScheme="blue" size="lg" onClick={() => navigate('/')}>Back to Home</Button>
        </VStack>
      </Container>
    </Box>
  );
}
