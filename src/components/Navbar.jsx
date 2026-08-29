import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';
import Button from './ui/Button';

export default function Navbar({
  userName,
  notificationsEnabled,
  onToggleNotifications,
  onLogout,
  online,
  isAdmin,
}) {
  const navigate = useNavigate();
  return (
    <nav style={{
      background: colors.bgCard,
      borderBottom: `1px solid ${colors.border}`,
      padding: '0.875rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: colors.primaryDark,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          fontWeight: '700',
          color: colors.white,
        }}>
          LC
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '1rem', color: colors.white }}>LumaControl</div>
          <div style={{ fontSize: '0.72rem', color: colors.textMuted }}>
            {online ? 'Conectado' : 'Sin conexion'}
          </div>
        </div>
      </div>
      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
            Admin
          </Button>
        )}
        <span className="hide-mobile" style={{ fontSize: '0.85rem', color: colors.textMuted }}>
          {userName}
        </span>
        <Button
          variant={notificationsEnabled ? 'success' : 'ghost'}
          size="sm"
          onClick={onToggleNotifications}
        >
          {notificationsEnabled ? 'Alertas ON' : 'Alertas'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Salir
        </Button>
      </div>
    </nav>
  );
}
