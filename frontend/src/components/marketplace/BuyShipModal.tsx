import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, Button, VStack, Text,
  Badge, HStack, Divider, useToast,
} from '@chakra-ui/react';
import type { MarketplaceListing } from '../../services/marketplace.service';

interface BuyShipModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: MarketplaceListing | null;
  onConfirm: (listing: MarketplaceListing) => Promise<void>;
}

const RARITY_COLORS: Record<string, string> = {
  Common: 'gray', Uncommon: 'green', Rare: 'blue', Epic: 'purple', Legendary: 'orange',
};

export const BuyShipModal: React.FC<BuyShipModalProps> = ({ isOpen, onClose, listing, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  if (!listing) return null;

  const handleBuy = async () => {
    setLoading(true);
    try {
      await onConfirm(listing);
      toast({ title: '🎉 Ship purchased!', description: `${listing.shipType} (Lv${listing.level}) is now in your fleet`, status: 'success', duration: 5000 });
      onClose();
    } catch (e: unknown) {
      toast({ title: 'Purchase failed', description: e instanceof Error ? e.message : 'Try again', status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const sellerShort = `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="gray.900" border="1px solid" borderColor="blue.500">
        <ModalHeader color="blue.300">🚢 Purchase Ship</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Badge colorScheme={RARITY_COLORS[listing.rarity] ?? 'gray'} fontSize="md" px={3} py={1}>
                {listing.rarity}
              </Badge>
              <Text color="white" fontWeight="bold" fontSize="lg">{listing.shipType}</Text>
            </HStack>
            <Divider borderColor="gray.700" />
            <HStack justify="space-between">
              <Text color="gray.400">Level</Text>
              <Text color="white">{listing.level} / 10</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.400">Wins on-chain</Text>
              <Text color="green.300">{listing.wins}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.400">Seller</Text>
              <Text color="gray.300" fontFamily="mono">{sellerShort}</Text>
            </HStack>
            <Divider borderColor="gray.700" />
            <HStack justify="space-between">
              <Text color="gray.200" fontWeight="semibold">Price</Text>
              <Text color="cyan.300" fontWeight="bold" fontSize="xl">{listing.price} EGLD</Text>
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose} color="gray.400">Cancel</Button>
          <Button
            colorScheme="blue"
            onClick={handleBuy}
            isLoading={loading}
            loadingText="Confirming..."
          >
            Buy Now
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
