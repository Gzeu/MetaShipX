import { Avatar, Box, Container, Flex, Grid, Heading, Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack } from '@chakra-ui/react';
import { useDapp } from '../../contexts/DappProvider';

const ProfilePage = () => {
  const { address } = useDapp();
  
  // Mock data
  const stats = [
    { label: 'Games Played', value: '42' },
    { label: 'Win Rate', value: '68%' },
    { label: 'Total Rewards', value: '125 EGLD' },
    { label: 'Rank', value: '#1,234' },
  ];
  
  const recentGames = [
    { id: 1, opponent: '0x1234...5678', result: 'Victory', reward: '2.5 EGLD' },
    { id: 2, opponent: '0xabcd...ef01', result: 'Defeat', reward: '0 EGLD' },
    { id: 3, opponent: '0x2345...6789', result: 'Victory', reward: '3.1 EGLD' },
  ];
  
  const ownedShips = [
    { id: 1, name: 'Battleship Alpha', rarity: 'Rare', level: 5 },
    { id: 2, name: 'Destroyer Beta', rarity: 'Common', level: 3 },
    { id: 3, name: 'Cruiser Gamma', rarity: 'Uncommon', level: 7 },
  ];

  return (
    <Container maxW="container.xl" py={8}>
      <Flex direction={{ base: 'column', md: 'row' }} gap={8} mb={8}>
        <Box flexShrink={0}>
          <Avatar size="2xl" name="Player" bg="brand.500" color="white" />
        </Box>
        <Box>
          <Heading as="h1" size="xl" mb={2}>
            Player Profile
          </Heading>
          <Text fontFamily="mono" color="gray.500" mb={4}>
            {address || 'Not connected'}
          </Text>
          
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4} mt={6}>
            {stats.map((stat, index) => (
              <Box 
                key={index} 
                p={4} 
                borderWidth="1px" 
                borderRadius="lg"
                textAlign="center"
              >
                <Text fontSize="lg" fontWeight="bold" color="brand.500">
                  {stat.value}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {stat.label}
                </Text>
              </Box>
            ))}
          </Grid>
        </Box>
      </Flex>
      
      <Tabs variant="enclosed" colorScheme="brand">
        <TabList>
          <Tab>Recent Games</Tab>
          <Tab>My Ships</Tab>
          <Tab>Settings</Tab>
        </TabList>
        
        <TabPanels mt={4}>
          <TabPanel p={0}>
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
              {recentGames.map((game) => (
                <Flex 
                  key={game.id}
                  p={4} 
                  borderBottomWidth="1px"
                  _last={{ borderBottom: 'none' }}
                  justify="space-between"
                  align="center"
                >
                  <Box>
                    <Text fontWeight="medium">vs {game.opponent}</Text>
                    <Text fontSize="sm" color="gray.500">Game #{game.id}</Text>
                  </Box>
                  <Box textAlign="right">
                    <Text color={game.result === 'Victory' ? 'green.500' : 'red.500'} fontWeight="medium">
                      {game.result}
                    </Text>
                    <Text fontSize="sm" color="yellow.500">+{game.reward}</Text>
                  </Box>
                </Flex>
              ))}
            </Box>
          </TabPanel>
          
          <TabPanel p={0}>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
              {ownedShips.map((ship) => (
                <Box 
                  key={ship.id}
                  borderWidth="1px" 
                  borderRadius="lg" 
                  p={4}
                  _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                  transition="all 0.2s"
                >
                  <Box h="120px" bg="gray.100" mb={3} borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                    <Text color="gray.500">Ship #{ship.id}</Text>
                  </Box>
                  <Text fontWeight="medium">{ship.name}</Text>
                  <Flex justify="space-between" mt={2}>
                    <Text fontSize="sm" color="gray.500">{ship.rarity}</Text>
                    <Text fontSize="sm">Lv. {ship.level}</Text>
                  </Flex>
                </Box>
              ))}
            </Grid>
          </TabPanel>
          
          <TabPanel>
            <Text>Profile settings will be available soon.</Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default ProfilePage;
