export const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};

export const formatEGLD = (value: string, decimals: number = 2): string => {
  if (!value) return '0';
  const num = parseFloat(value) / 1e18; // Convert from wei to EGLD
  return num.toFixed(decimals);
};

export const isAddressValid = (address: string): boolean => {
  // Simple validation for MultiversX addresses (erd1...)
  return /^erd1[a-z0-9]{58,61}$/.test(address);
};
