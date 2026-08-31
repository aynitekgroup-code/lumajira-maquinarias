import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, radius } from '../styles/theme';
import { useAuth } from '../hooks/useAuth';
import useAllies from '../hooks/useAllies';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const emptyForm = { name: '', email: '', whatsapp: '', position: '', empresa: '', description: '' };

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  background: colors.bgInput,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  color: colors.text,
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: '0.8rem',
  color: colors.textMuted,
  marginBottom: '0.3rem',
  display: 'block',
};

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const { allies, loading, addAllie, updateAllie, deleteAllie } = useAllies();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAllie(editingId, form);
        showToast('Aliado actualizado', 'success');
      } else {
        await addAllie(form);
        showToast('Aliado agregado', 'success');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  function handleEdit(ally) {
    setForm({ name: ally.name, email: ally.email, whatsapp: ally.whatsapp || '', position: ally.position || '', empresa: ally.empresa || '', description: ally.description || '' });
    setEditingId(ally.id);
    setShowForm(true);
  }

  function handleCancel() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleDelete(id) {
    try {
      await deleteAllie(id);
      setConfirmDelete(null);
      showToast('Aliado eliminado', 'success');
    } catch (err) {
      showToast('Error al eliminar', 'error');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <Navbar
        userName={user?.displayName || user?.email}
        notificationsEnabled={false}
        onToggleNotifications={() => {}}
        onLogout={handleLogout}
        online={navigator.onLine}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: spacing.lg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }}>
          <div>
            <h1 style={{ color: colors.white, fontSize: '1.5rem', margin: 0 }}>Panel de Administrador</h1>
            <p style={{ color: colors.textMuted, fontSize: '0.85rem', margin: '0.3rem 0 0' }}>Gestionar aliados de LumaControl</p>
          </div>
          <Button variant="primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
            {showForm ? 'Cancelar' : '+ Nuevo aliado'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
            <h3 style={{ color: colors.white, margin: '0 0 1rem', fontSize: '1.1rem' }}>
              {editingId ? 'Editar aliado' : 'Agregar aliado'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing.md }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input name="name" value={form.name} onChange={handleChange} style={inputStyle} placeholder="Nombre completo" />
              </div>
              <div>
                <label style={labelStyle}>Correo</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="correo@empresa.com" />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input name="whatsapp" value={form.whatsapp} onChange={handleChange} style={inputStyle} placeholder="+51 999 888 777" />
              </div>
              <div>
                <label style={labelStyle}>Cargo</label>
                <input name="position" value={form.position} onChange={handleChange} style={inputStyle} placeholder="Gerente de Operaciones" />
              </div>
              <div>
                <label style={labelStyle}>Empresa</label>
                <input name="empresa" value={form.empresa} onChange={handleChange} style={inputStyle} placeholder="Nombre de la empresa" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Descripcion</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Descripcion del aliado..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
              <Button type="submit" variant="success">
                {editingId ? 'Actualizar' : 'Guardar'}
              </Button>
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ color: colors.textMuted, textAlign: 'center', padding: spacing.xl }}>Cargando aliados...</div>
        ) : allies.length === 0 ? (
          <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.xl, textAlign: 'center' }}>
            <p style={{ color: colors.textMuted, fontSize: '0.95rem' }}>No hay aliados registrados</p>
            <p style={{ color: colors.textMuted, fontSize: '0.8rem' }}>Haz clic en "Nuevo aliado" para agregar el primero</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: spacing.md }}>
            {allies.map(ally => (
              <div key={ally.id} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.sm }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ color: colors.white, margin: '0 0 0.3rem', fontSize: '1.1rem' }}>{ally.name}</h3>
                    {ally.position && ally.empresa && (
                      <p style={{ color: colors.primary, margin: '0 0 0.5rem', fontSize: '0.85rem' }}>{ally.position} - {ally.empresa}</p>
                    )}
                    {ally.position && !ally.empresa && (
                      <p style={{ color: colors.primary, margin: '0 0 0.5rem', fontSize: '0.85rem' }}>{ally.position}</p>
                    )}
                    {!ally.position && ally.empresa && (
                      <p style={{ color: colors.primary, margin: '0 0 0.5rem', fontSize: '0.85rem' }}>{ally.empresa}</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {ally.email && <span style={{ color: colors.textMuted, fontSize: '0.82rem' }}>📧 {ally.email}</span>}
                      {ally.whatsapp && (
                        <a
                          href={`https://wa.me/${ally.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: colors.success, fontSize: '0.82rem', textDecoration: 'none' }}
                        >
                          📱 {ally.whatsapp} → Enviar mensaje
                        </a>
                      )}
                    </div>
                    {ally.description && (
                      <p style={{ color: colors.textMuted, fontSize: '0.82rem', marginTop: '0.5rem', lineHeight: '1.5' }}>{ally.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ally)}>
                      Editar
                    </Button>
                    {confirmDelete === ally.id ? (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <span style={{ color: colors.critical, fontSize: '0.8rem' }}>Eliminar?</span>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(ally.id)}>Si</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>No</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(ally.id)} style={{ color: colors.critical }}>
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
