import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
  analyzeCurrentReading,
  predictiveMaintenance,
} from '../utils/alerts';

const MACHINE_STATES = ['idle', 'heating', 'injecting', 'cooling'];
const PLASTIC_PROFILES = {
  PP: { minTemp: 200, maxTemp: 230, nominalCurrent: 4.5 },
  PE: { minTemp: 180, maxTemp: 220, nominalCurrent: 4.0 },
  ABS: { minTemp: 220, maxTemp: 260, nominalCurrent: 5.5 },
  PET: { minTemp: 260, maxTemp: 280, nominalCurrent: 6.0 },
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export function useMockSensorData(enabled = false) {
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [machineState, setMachineState] = useState('idle');
  const [currentTemp, setCurrentTemp] = useState(25);
  const [targetTemp, setTargetTemp] = useState(220);
  const [injectionSpeed, setInjectionSpeed] = useState(50);
  const [cycleCount, setCycleCount] = useState(0);

  const stateRef = useRef({
    currentAmps: 0.3,
    temperature: 25,
    state: 'idle',
    cyclePhase: 0,
    timeInState: 0,
    plastic: 'PP',
  });

  const simulateReading = useCallback(() => {
    const s = stateRef.current;
    s.timeInState++;

    const profile = PLASTIC_PROFILES[s.plastic];

    switch (s.state) {
      case 'idle':
        s.currentAmps = clamp(s.currentAmps + randomBetween(-0.05, 0.05), 0.1, 0.5);
        s.temperature = clamp(s.temperature + randomBetween(-1, 1), 20, 35);
        if (s.timeInState > 5) {
          s.state = 'heating';
          s.timeInState = 0;
        }
        break;

      case 'heating':
        s.currentAmps = clamp(s.currentAmps + randomBetween(0.1, 0.5), 3.0, 7.5);
        s.temperature = clamp(s.temperature + randomBetween(2, 5), 25, profile.maxTemp);
        if (s.temperature >= profile.minTemp) {
          s.state = 'injecting';
          s.timeInState = 0;
        }
        break;

      case 'injecting':
        s.currentAmps = clamp(
          s.currentAmps + randomBetween(-0.3, 0.3),
          profile.nominalCurrent - 1.5,
          profile.nominalCurrent + 2.0
        );
        s.temperature = clamp(s.temperature + randomBetween(-2, 2), profile.minTemp - 10, profile.maxTemp + 10);
        if (s.timeInState > 8) {
          s.state = 'cooling';
          s.timeInState = 0;
        }
        break;

      case 'cooling':
        s.currentAmps = clamp(s.currentAmps + randomBetween(-0.2, 0.1), 0.5, 3.0);
        s.temperature = clamp(s.temperature + randomBetween(-3, -1), profile.minTemp - 20, profile.maxTemp);
        if (s.timeInState > 6) {
          s.state = 'idle';
          s.timeInState = 0;
          s.cyclePhase++;
          if (s.cyclePhase % 3 === 0) {
            setCycleCount((c) => c + 1);
          }
        }
        break;

      default:
        break;
    }

    const timestamp = Date.now();
    const row = {
      current_a: parseFloat(s.currentAmps.toFixed(2)),
      temperature_c: parseFloat(s.temperature.toFixed(1)),
      timestamp,
    };

    setReadings((prev) => {
      const next = [
        ...prev,
        {
          time: format(new Date(timestamp), 'HH:mm:ss'),
          value: row.current_a,
        },
      ];
      return next.slice(-60);
    });

    setCurrentTemp(row.temperature_c);
    setMachineState(s.state);

    const status = analyzeCurrentReading(row.current_a);
    setCurrentStatus(status);

    const predictive = predictiveMaintenance([
      { value: row.current_a - 0.5 },
      { value: row.current_a - 0.3 },
      { value: row.current_a },
      { value: row.current_a + 0.2 },
      { value: row.current_a },
    ]);
    const allAlerts = [
      status.level !== 'normal' ? status : null,
      ...(predictive || []),
    ].filter(Boolean);
    setAlerts(allAlerts);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setReadings([]);
      setAlerts([]);
      setCurrentStatus(null);
      setConnected(false);
      return;
    }

    setConnected(true);

    const interval = setInterval(() => {
      simulateReading();
    }, 1500);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [enabled, simulateReading]);

  const latestReading = readings[readings.length - 1];

  const sendCommand = useCallback((type, params = {}) => {
    const s = stateRef.current;
    switch (type) {
      case 'setTemp':
        setTargetTemp(params.targetTemp || 220);
        break;
      case 'inject':
        s.state = 'injecting';
        s.timeInState = 0;
        setInjectionSpeed(params.speed || 50);
        break;
      case 'rotate':
        setInjectionSpeed(params.speed || 30);
        break;
      case 'emergencyStop':
        s.state = 'idle';
        s.currentAmps = 0.1;
        s.timeInState = 0;
        break;
      case 'emergencyReset':
        s.state = 'idle';
        s.timeInState = 0;
        break;
      case 'stop':
        s.state = 'idle';
        s.currentAmps = 0.3;
        s.timeInState = 0;
        break;
      default:
        break;
    }
  }, []);

  return {
    readings,
    alerts,
    currentStatus,
    connected,
    latestReading,
    machineState,
    currentTemp,
    targetTemp,
    injectionSpeed,
    cycleCount,
    sendCommand,
  };
}
