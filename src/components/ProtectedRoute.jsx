// this is for if the user is loged in then show the page if not
// then redirect to login page
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  console.log(`[ProtectedRoute] path: ${location.pathname}, isAuthenticated: ${isAuthenticated}`);

  if (!isAuthenticated) {
    console.log(`[ProtectedRoute] Not authenticated, redirecting to login`);
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  console.log(`[ProtectedRoute] Authenticated, allowing access to ${location.pathname}`);
  return children;
}
