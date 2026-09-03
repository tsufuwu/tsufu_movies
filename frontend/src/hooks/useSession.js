import { useState, useEffect } from 'react';
import { initSession } from '../api/movieApi';

/**
 * React Hook to access and manage ephemeral session state.
 */
export function useSession() {
  const [token, setToken] = useState(() => {
    try {
      return window.sessionStorage.getItem('tsufu_session_token') || null;
    } catch {
      return null;
    }
  });
  const [isReady, setIsReady] = useState(Boolean(token));
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function handshake() {
      try {
        const sessionToken = await initSession();
        if (isMounted) {
          setToken(sessionToken);
          setIsReady(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setIsReady(true);
        }
      }
    }

    if (!token) {
      handshake();
    } else {
      setIsReady(true);
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const refresh = async () => {
    setIsReady(false);
    try {
      const newToken = await initSession(true);
      setToken(newToken);
      return newToken;
    } finally {
      setIsReady(true);
    }
  };

  return { token, isReady, error, refresh };
}
