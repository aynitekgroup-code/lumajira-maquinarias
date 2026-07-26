import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este correo ya está registrado.',
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/user-not-found': 'Usuario no encontrado.',
      };
      setError(msgs[err.code] || 'Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1628',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#0f2040',
        borderRadius: '16px',
        border: '1px solid #1d4e8f',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '420px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            background: '#1d4e8f',
            borderRadius: '14px',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
          }}>⚙️</div>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
            Lumajira Maquinarias
          </h1>
          <p style={{ color: '#5a8fc4', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
          </p>
        </div>

        <div style={{ display: 'flex', background: '#0a1628', borderRadius: '10px', marginBottom: '1.5rem', padding: '4px' }}>
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: mode === m ? '#1d4e8f' : 'transparent',
                color: mode === m ? '#fff' : '#5a8fc4',
                transition: 'all 0.2s',
              }}
            >
              {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={labelStyle}>Nombre completo</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="José Llanos" style={inputStyle} />
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="correo@empresa.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="••••••••" style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: '#2a0f0f', border: '1px solid #7a2020', borderRadius: '8px', padding: '0.75rem', color: '#f09595', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#1d4e8f88' : '#1d4e8f',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.875rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  color: '#5a8fc4',
  fontSize: '0.8rem',
  fontWeight: '500',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle = {
  width: '100%',
  background: '#0a1628',
  border: '1px solid #1d4e8f',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  color: '#fff',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};
