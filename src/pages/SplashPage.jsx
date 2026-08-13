import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { colors } from '../styles/theme';

export default function SplashPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors.bgCard,
      gap: '1.5rem',
      padding: '2rem 1.5rem',
    }}>
      <img
        src="/team.png.png"
        alt="Equipo LumaControl"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          objectFit: 'cover',
          border: `2px solid ${colors.border}`,
        }}
      />

      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <h1 style={{
          color: colors.white,
          fontSize: 'clamp(1.75rem, 5vw, 2.2rem)',
          fontWeight: '700',
          margin: '0 0 0.5rem',
        }}>
          LumaControl
        </h1>
        <div style={{
          width: 60,
          height: 3,
          background: `linear-gradient(90deg, ${colors.primaryDark}, ${colors.primary})`,
          margin: '0 auto 1rem',
          borderRadius: 2,
        }} />
        <p style={{
          color: '#8ab4e8',
          margin: '0 0 0.75rem',
          fontSize: '0.95rem',
          lineHeight: 1.7,
        }}>
          Monitoreo y control de maquinaria industrial con IA, IoT y analisis en tiempo real.
        </p>
      </div>

      <Button size="lg" onClick={() => navigate('/login')} style={{ minWidth: 200 }}>
        Entrar
      </Button>

      <p style={{ color: colors.textMuted, fontSize: '0.8rem' }}>
        Lumajira — Inteligencia artificial para la industria
      </p>
    </div>
  );
}
