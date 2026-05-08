/**
 * Thin context re-exporting sdk-dapp account info.
 * No WalletConnect — auth is handled via UnlockPage
 * using xPortal App QR, Web Wallet, or DeFi Wallet extension.
 */
import React, { createContext, useContext } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useGetLoginInfo }   from '@multiversx/sdk-dapp/hooks';

type DappCtx = {
  isLoggedIn: boolean;
  address: string;
};

const DappContext = createContext<DappCtx>({ isLoggedIn: false, address: '' });

export const DappProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address }    = useGetAccountInfo();
  const { isLoggedIn } = useGetLoginInfo();

  return (
    <DappContext.Provider value={{ isLoggedIn, address: address ?? '' }}>
      {children}
    </DappContext.Provider>
  );
};

export const useDapp = (): DappCtx => useContext(DappContext);
export default DappProvider;
