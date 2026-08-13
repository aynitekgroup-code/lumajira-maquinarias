import { colors } from '../styles/theme';
import Button from './ui/Button';

export default function MachineSelector({
  machines,
  selectedMachine,
  onSelect,
  showAddMachine,
  onToggleAdd,
  newMachineName,
  onNameChange,
  onAdd,
  onUploadImage,
  uploadingImage,
}) {
  return (
    <>
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {machines.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            style={{
              background: selectedMachine?.id === m.id ? colors.primaryDark : colors.bgCard,
              border: `1px solid ${selectedMachine?.id === m.id ? colors.primary : colors.border}`,
              borderRadius: '10px',
              color: selectedMachine?.id === m.id ? colors.white : colors.textMuted,
              padding: '0.6rem 1rem',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {m.imageUrl ? (
              <img
                src={m.imageUrl}
                alt=""
                style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '1rem' }}>M</span>
            )}
            {m.name}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={onToggleAdd}>
          + Agregar maquina
        </Button>
      </div>

      {showAddMachine && (
        <div style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <input
            value={newMachineName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Nombre (ej. Inyectora JM-80)"
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            style={{
              flex: 1,
              minWidth: '200px',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: colors.white,
              fontSize: '0.95rem',
              outline: 'none',
              minHeight: '44px',
            }}
          />
          <label style={{
            border: `1px dashed ${colors.border}`,
            borderRadius: '8px',
            color: colors.textMuted,
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
          }}>
            Subir imagen
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files[0] && onUploadImage(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
          <Button onClick={onAdd} disabled={uploadingImage}>
            {uploadingImage ? 'Subiendo...' : 'Guardar'}
          </Button>
        </div>
      )}
    </>
  );
}

export function MachineHeader({ machine, onUploadImage, uploadingImage }) {
  if (!machine) return null;
  return (
    <div style={{
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      display: 'flex',
      gap: '1.25rem',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {machine.imageUrl ? (
        <img
          src={machine.imageUrl}
          alt={machine.name}
          style={{
            width: 100,
            height: 100,
            borderRadius: 12,
            objectFit: 'cover',
            border: `2px solid ${colors.border}`,
          }}
        />
      ) : (
        <div style={{
          width: 100,
          height: 100,
          borderRadius: 12,
          background: colors.bg,
          border: `2px dashed ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: colors.textMuted,
        }}>
          M
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.75rem',
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Maquina seleccionada
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: colors.white, marginTop: '0.25rem' }}>
          {machine.name}
        </div>
      </div>
      <label style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        color: colors.textMuted,
        padding: '0.75rem 1rem',
        cursor: 'pointer',
        fontSize: '0.85rem',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
      }}>
        {uploadingImage ? 'Subiendo...' : 'Cambiar imagen'}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files[0] && onUploadImage(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
}

export function EmptyMachines({ onAdd }) {
  return (
    <div style={{
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '3rem 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>M</div>
      <h2 style={{ color: colors.white, marginBottom: '0.5rem' }}>No hay maquinas registradas</h2>
      <p style={{ color: colors.textMuted, marginBottom: '1.5rem' }}>
        Agrega tu primera maquina de inyeccion para comenzar el monitoreo.
      </p>
      <Button onClick={onAdd}>Agregar maquina</Button>
    </div>
  );
}

function SensorCard({ type, label, unit, active }) {
  return (
    <div style={{
      background: active ? '#071228' : colors.bgCard,
      border: `1px solid ${active ? colors.primary : colors.borderLight}`,
      borderRadius: '10px',
      padding: '1rem 1.25rem',
      minWidth: '180px',
      opacity: active ? 1 : 0.5,
    }}>
      <div style={{ fontWeight: '700', color: active ? colors.primary : colors.textMuted, fontSize: '0.95rem' }}>
        {type}
      </div>
      <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: '0.25rem' }}>{label}</div>
      {unit && (
        <div style={{ fontSize: '0.75rem', color: colors.border, marginTop: '0.25rem' }}>
          Unidad: {unit}
        </div>
      )}
    </div>
  );
}

export function SensorList() {
  return (
    <div style={{
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '1.5rem',
    }}>
      <h2 style={{ color: colors.white, margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600' }}>
        Sensores registrados
      </h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <SensorCard type="SCT-013" label="Corriente resistencias de banda" unit="A" active />
        <SensorCard type="NTC-10K" label="Temperatura barril" unit="C" active />
        <SensorCard type="+ Agregar" label="Mas sensores proximamente" unit="" active={false} />
      </div>
    </div>
  );
}
