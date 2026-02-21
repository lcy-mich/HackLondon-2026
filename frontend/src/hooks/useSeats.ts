import { useEffect } from 'react';
import { getSeats } from '../services/api';
import { useSeatStore } from '../store/seatStore';

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 10000;

export function useSeats() {
  const { setSeats, setLoading, setError } = useSeatStore();

  useEffect(() => {
    async function fetchSeats() {
      setLoading(true);
      try {
        const res = await getSeats();
        if (res.success) {
          setSeats(res.data);
          setError(null);
        } else {
          setError(res.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch seats');
      } finally {
        setLoading(false);
      }
    }

    fetchSeats();
    const interval = setInterval(fetchSeats, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [setSeats, setLoading, setError]);
}
