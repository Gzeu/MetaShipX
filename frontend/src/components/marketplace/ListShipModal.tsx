import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, Button, Input, FormControl,
  FormLabel, FormHelperText, VStack, Text, Badge, useToast,
} from '@chakra-ui/react';

interface ListShipModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipNonce: number;
  shipType: string;
  shipLevel: number;
  tokenIdentifier: string;
  onConfirm: (nonce: number, priceEgld: string, tokenIdentifier: string) => Promise<void>;
}

export const ListShipModal: React.FC<ListShipModalProps> = ({
  isOpen, onClose, shipNonce, shipType, shipLevel, tokenIdentifier, onConfirm,
}) => {
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: 'Invalid price', description: 'Enter a valid EGLD amount > 0', status: 'error', duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      await onConfirm(shipNonce, price, tokenIdentifier);
      toast({ title: 'Ship listed!', description: `Listed for ${price} EGLD`, status: 'success', duration: 4000 });
      onClose();
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Transaction failed', status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="gray.900" border="1px solid" borderColor="cyan.600">
        <ModalHeader color="cyan.300">⚓ List Ship on Marketplace</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text color="gray.300">
              <Badge colorScheme="cyan" mr={2}>{shipType}</Badge>
              Level {shipLevel} · Nonce #{shipNonce}
            </Text>
            <FormControl>
              <FormLabel color="gray.200">Sale Price (EGLD)</FormLabel>
              <Input
                placeholder="e.g. 0.25"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0.001"
                step="0.001"
                bg="gray.800"
                color="white"
                borderColor="gray.600"
                _focus={{ borderColor: 'cyan.400' }}
              />
              <FormHelperText color="gray.500">Marketplace fee: 2.5% deducted from sale</FormHelperText>
            </FormControl>
            {price && !isNaN(parseFloat(price)) && (
              <Text color="green.300" fontSize="sm">
                You receive: {(parseFloat(price) * 0.975).toFixed(4)} EGLD after fees
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose} color="gray.400">Cancel</Button>
          <Button
            colorScheme="cyan"
            onClick={handleConfirm}
            isLoading={loading}
            loadingText="Signing..."
          >
            List Ship
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
