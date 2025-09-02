import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <Container maxW="container.md" py={20} textAlign="center">
      <VStack spacing={6}>
        <Box>
          <Text fontSize="6xl" fontWeight="bold" color="brand.500">404</Text>
          <Heading as="h1" size="xl" mt={4}>Page Not Found</Heading>
        </Box>
        
        <Text fontSize="lg" color={useColorModeValue('gray.600', 'gray.300')} maxW="md" mx="auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </Text>
        
        <Button 
          as={RouterLink} 
          to="/" 
          colorScheme="brand" 
          size="lg" 
          mt={6}
        >
          Return Home
        </Button>
        
        <Box mt={12}>
          <Text fontSize="sm" color="gray.500">
            Need help? Contact our support team
          </Text>
        </Box>
      </VStack>
    </Container>
  );
};

export default NotFoundPage;
