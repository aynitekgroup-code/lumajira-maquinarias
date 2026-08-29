import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { supabase } from '../supabase/config';
import {
  analyzeCurrentReading,
  predictiveMaintenance,
} from '../utils/alerts';

export function useSensorData(rtdbId, notificationsEnabled) {
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const lastAlertSent = useRef('');

  useEffect(() => {
    if (!rtdbId) {
      setReadings([]);
      setAlerts([]);
      setCurrentStatus(null);
      setConnected(false);
      return;
    }

    const channel = supabase
      .channel(`sensor-${rtdbId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensor_readings',
          filter: `user_id=eq.${rtdbId}`,
        },
        (payload) => {
          processNewReading(payload.new);
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    fetchInitialReadings(rtdbId);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rtdbId, notificationsEnabled]);

  async function fetchInitialReadings(userId) {
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(60);
    if (error || !data) return;

    const list = data.reverse();
    if (list.length === 0) return;

    setReadings(list.map((r) => ({
      time: format(new Date(r.timestamp), 'HH:mm:ss'),
      value: parseFloat((r.current_a || 0).toFixed(2)),
    })));

    const latest = list[list.length - 1];
    const status = analyzeCurrentReading(latest.current_a);
    setCurrentStatus(status);
    const predictive = predictiveMaintenance(list.map((r) => ({ value: r.current_a })));
    const allAlerts = [status.level !== 'normal' ? status : null, ...(predictive || [])].filter(Boolean);
    setAlerts(allAlerts);
  }

  function processNewReading(row) {
    if (!row || typeof row.timestamp !== 'number') return;

    setReadings((prev) => {
      const next = [...prev, {
        time: format(new Date(row.timestamp), 'HH:mm:ss'),
        value: parseFloat((row.current_a || 0).toFixed(2)),
      }];
      return next.slice(-60);
    });

    const status = analyzeCurrentReading(row.current_a);
    setCurrentStatus(status);

    const predictive = predictiveMaintenance([{ value: row.current_a }]);
    const allAlerts = [status.level !== 'normal' ? status : null, ...(predictive || [])].filter(Boolean);
    setAlerts(allAlerts);

    if (
      status.level === 'critical' &&
      notificationsEnabled &&
      row.timestamp &&
      lastAlertSent.current !== row.timestamp
    ) {
      lastAlertSent.current = row.timestamp;
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Alerta: ${status.message}`, {
          body: status.maintenance || 'Revisa la maquina de inyeccion',
          icon: '/team.png.png',
        });
      }
    }
  }

  const latestReading = readings[readings.length - 1];

  return {
    readings,
    alerts,
    currentStatus,
    connected,
    latestReading,
  };
}
