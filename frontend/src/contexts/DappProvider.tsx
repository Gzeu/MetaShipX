import React, { createContext, useContext, useEffect, useState } from 'react';
import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/out/react/account/useGetAccountInfo';
import { useGetLoginInfo } from '@multiversx/sdk-dapp/out/react/loginInfo/useGetLoginInfo';
import { environment } from '../config';

type DappContextType = {
  isLoggedIn: boolean;
  address: string;
  isInitialized: boolean;
  environment: EnvironmentsEnum;
};

const DappContext = createContext<DappContextType | undefined>(undefined);

export const DappProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { address } = useGetAccountInfo();
  const { isLoggedIn } = useGetLoginInfo();

  useEffect(() => { setIsInitialized(true); }, []);

  const env =
    environment.id === 'mainnet' ? EnvironmentsEnum.mainnet
    : environment.id === 'testnet' ? EnvironmentsEnum.testnet
    : EnvironmentsEnum.devnet;

  return (
    <DappContext.Provider value={{ isLoggedIn, address: address ?? '', isInitialized, environment: env }}>
      {children}
    </DappContext.Provider>
  );
};

export const useDapp = (): DappContextType => {
  const ctx = useContext(DappContext);
  if (!ctx) throw new Error('useDapp must be used within a DappProvider');
  return ctx;
};

export default DappProvider;
