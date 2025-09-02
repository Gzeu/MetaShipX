import { createContext, useContext, useEffect, useState } from 'react';
import { DappProvider as MultiversxDappProvider, NetworkId } from '@multiversx/sdk-dapp';
import { environment } from '../config';
import { useGetAccountInfo, useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';

type DappContextType = {
  isLoggedIn: boolean;
  address: string;
  login: (method: 'wallet' | 'extension') => Promise<void>;
  logout: () => void;
  isInitialized: boolean;
};

const DappContext = createContext<DappContextType | undefined>(undefined);

export const DappProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { address, account } = useGetAccountInfo();
  const { isLoggedIn } = useGetLoginInfo();

  useEffect(() => {
    // Initialize any required services here
    setIsInitialized(true);
  }, []);

  const login = async (method: 'wallet' | 'extension') => {
    // Implementation for login
    console.log(`Login with ${method}`);
  };

  const logout = () => {
    // Implementation for logout
    console.log('Logout');  };

  return (
    <MultiversxDappProvider
      environment={environment.id as NetworkId}
      customNetworkConfig={{
        name: environment.id,
        apiTimeout: 6000,
        walletConnectV2ProjectId: environment.walletConnectV2ProjectId,
      }}
    >
      <DappContext.Provider
        value={{
          isLoggedIn,
          address: address,
          login,
          logout,
          isInitialized,
        }}
      >
        {children}
      </DappContext.Provider>
    </MultiversxDappProvider>
  );
};

export const useDapp = (): DappContextType => {
  const context = useContext(DappContext);
  if (!context) {
    throw new Error('useDapp must be used within a DappProvider');
  }
  return context;
};

export default DappProvider;
