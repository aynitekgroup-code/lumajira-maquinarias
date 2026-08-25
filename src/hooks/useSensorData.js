import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { format } from 'date-fns';
import { rtdb } from '../firebase/config';
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

    const sensorRef = ref(rtdb, `sensors/${rtdbId}/sct013`);
    const unsub = onValue(sensorRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setConnected(false);
        return;
      }
      setConnected(true);
      const list = Object.entries(data)
        .map(([k, v]) => ({ id: k, ...v }))
        .filter((r) => typeof r.timestamp === 'number' && r.timestamp > 0)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-60);
      if (list.length === 0) return;

      setReadings(list.map((r) => ({
        time: format(new Date(r.timestamp), 'HH:mm:ss'),
        value: parseFloat(r.current_a?.toFixed(2) || 0),
      })));

      const latest = list[list.length - 1];
      if (!latest) return;

      const status = analyzeCurrentReading(latest.current_a);
      setCurrentStatus(status);
      const predictive = predictiveMaintenance(list.map((r) => ({ value: r.current_a })));
      const allAlerts = [status.level !== 'normal' ? status : null, ...(predictive || [])].filter(Boolean);
      setAlerts(allAlerts);

      if (
        status.level === 'critical' &&
        notificationsEnabled &&
        latest.timestamp &&
        lastAlertSent.current !== latest.timestamp
      ) {
        lastAlertSent.current = latest.timestamp;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Alerta: ${status.message}`, {
            body: status.maintenance || 'Revisa la maquina de inyeccion',
            icon: '/team.png.png',
          });
        }
      }
    });

    return () => unsub();
  }, [rtdbId, notificationsEnabled]);

  const latestReading = readings[readings.length - 1];

  return {
    readings,
    alerts,
    currentStatus,
    connected,
    latestReading,
  };
}
