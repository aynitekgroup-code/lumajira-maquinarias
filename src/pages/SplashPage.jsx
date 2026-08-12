import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/login'), 8000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a1628',
      gap: '1.5rem',
      padding: '2rem',
    }}>
      <img
        src="/team.png.png"
        alt="Equipo LumaControl"
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '16px',
          objectFit: 'cover',
          border: '2px solid #1d4e8f',
        }}
      />

      <div style={{ textAlign: 'center', maxWidth: '650px' }}>
        <h1 style={{
          color: '#ffffff',
          fontSize: '2.2rem',
          fontWeight: '700',
          letterSpacing: '-0.02em',
          margin: '0 0 0.5rem',
        }}>
          LumaControl
        </h1>
        <div style={{
          width: '60px',
          height: '3px',
          background: 'linear-gradient(90deg, #1d4e8f, #378add)',
          margin: '0 auto 1rem',
          borderRadius: '2px',
        }} />
        <p style={{
          color: '#8ab4e8',
          margin: '0 0 0.75rem',
          fontSize: '0.95rem',
          lineHeight: '1.7',
        }}>
          LumaControl desarrolla soluciones de Inteligencia Artificial para automatizar maquinas industriales. Comenzamos con maquinas de inyeccion de plastico inteligentes, integrando IA, IoT y analisis de datos para optimizar la produccion, reducir tiempos de inactividad y predecir fallas.
        </p>
        <p style={{
          color: '#5a8fc4',
          margin: '0',
          fontSize: '0.85rem',
          lineHeight: '1.6',
          fontStyle: 'italic',
        }}>
          Nuestra vision es expandir esta tecnologia a todo tipo de maquinaria industrial y construir la capa de inteligencia que impulse la fabricacion del futuro.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#1d4e8f',
            animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
