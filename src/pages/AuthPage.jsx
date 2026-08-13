import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { colors, radius } from '../styles/theme';

const labelStyle = {
  display: 'block',
  color: colors.textMuted,
  fontSize: '0.8rem',
  fontWeight: '500',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle = {
  width: '100%',
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  padding: '0.75rem 1rem',
  color: colors.white,
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  minHeight: '44px',
};

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(form.name, form.email, form.password);
        showToast('Cuenta creada correctamente', 'success');
      } else {
        await login(form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este correo ya esta registrado.',
        'auth/invalid-credential': 'Correo o contrasena incorrectos.',
        'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
        'auth/user-not-found': 'Usuario no encontrado.',
      };
      showToast(msgs[err.code] || 'Error al iniciar sesion', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgCard,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <Card style={{ width: '100%', maxWidth: 420, padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52,
            height: 52,
            background: colors.primaryDark,
            borderRadius: 14,
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            color: colors.white,
            fontSize: '1.1rem',
          }}>
            LC
          </div>
          <h1 style={{ color: colors.white, fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
            LumaControl
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {mode === 'login' ? 'Inicia sesion para continuar' : 'Crea tu cuenta'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          background: colors.bg,
          borderRadius: 10,
          marginBottom: '1.5rem',
          padding: 4,
        }}>
          {['login', 'register'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: mode === m ? colors.primaryDark : 'transparent',
                color: mode === m ? colors.white : colors.textMuted,
                minHeight: '44px',
              }}
            >
              {m === 'login' ? 'Iniciar Sesion' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Jose Llanos" style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Correo electronico</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="correo@empresa.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Contrasena</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
          </div>

          <Button type="submit" disabled={loading} fullWidth style={{ marginTop: '0.5rem' }}>
            {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
