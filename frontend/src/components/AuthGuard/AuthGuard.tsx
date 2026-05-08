/**
 * AuthGuard — redirects unauthenticated users to /unlock.
 * Wrap any <Route> that requires a connected wallet.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';

interface Props {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<Props> = ({ children }) => {
  const { isLoggedIn } = useGetLoginInfo();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/unlock" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
