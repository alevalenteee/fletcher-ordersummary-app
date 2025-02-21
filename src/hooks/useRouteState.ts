import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useRouteState() {
  const location = useLocation();
  const navigate = useNavigate();

  // Save current route state when location changes
  useEffect(() => {
    try {
      console.log('Saving route state:', location.pathname);
      localStorage.setItem('lastRoute', JSON.stringify({
        pathname: location.pathname,
        search: location.search,
        state: location.state
      }));
    } catch (error) {
      console.error('Error saving route state:', error);
    }
  }, [location]);

  // Handle 404s and invalid routes
  useEffect(() => {
    const validRoutes = ['/', '/print', '/live-loading'];
    if (!validRoutes.includes(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  return {
    restoreLastRoute: () => {
      try {
        const savedRoute = localStorage.getItem('lastRoute');
        console.log('Restoring route state:', savedRoute);
        if (savedRoute) {
          const { pathname, search, state } = JSON.parse(savedRoute);
          navigate(pathname + search, { state, replace: true });
          return true;
        }
      } catch (error) {
        console.error('Error restoring route:', error);
      }
      console.log('No saved route found, staying on current route');
      return false;
    }
  };
}