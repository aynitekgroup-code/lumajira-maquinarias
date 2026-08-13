import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { format } from 'date-fns';
import { rtdb } from '../firebase/config';
import {
  analyzeCurrentReading,
  analyzeTemperatureReading,
  predictiveMaintenance,
} from '../utils/alerts';

export function useSensorData(rtdbId, notificationsEnabled) {
  const [readings, setReadings] = useState([]);
  const [tempReadings, setTempReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [tempStatus, setTempStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const lastAlertSent = useRef('');

  useEffect(() => {
    if (!rtdbId) {
      setReadings([]);
      setTempReadings([]);
      setAlerts([]);
      setCurrentStatus(null);
      setTempStatus(null);
      setConnected(false);
      return;
    }

    const sensorRef = ref(rtdb, `sensors/${rtdbId}/sct013`);
    const unsubCurrent = onValue(sensorRef, (snap) => {
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

    const tempRef = ref(rtdb, `sensors/${rtdbId}/thermistor`);
    const unsubTemp = onValue(tempRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const list = Object.entries(data)
        .map(([k, v]) => ({ id: k, ...v }))
        .filter((r) => typeof r.timestamp === 'number' && r.timestamp > 0)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-60);
      if (list.length === 0) return;

      setTempReadings(list.map((r) => ({
        time: format(new Date(r.timestamp), 'HH:mm:ss'),
        value: parseFloat(r.temperature_c?.toFixed(1) || 0),
      })));

      const latest = list[list.length - 1];
      if (latest) {
        const status = analyzeTemperatureReading(latest.temperature_c);
        setTempStatus(status);
        if (status.level !== 'normal') {
          setAlerts((prev) => {
            const exists = prev.some((a) => a.message === status.message);
            return exists ? prev : [...prev, status];
          });
        }
      }
    });

    return () => {
      unsubCurrent();
      unsubTemp();
    };
  }, [rtdbId, notificationsEnabled]);

  const latestReading = readings[readings.length - 1];
  const latestTemp = tempReadings[tempReadings.length - 1];

  return {
    readings,
    tempReadings,
    alerts,
    currentStatus,
    tempStatus,
    connected,
    latestReading,
    latestTemp,
  };
}
