import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Phone } from 'lucide-react';

export default function ContactManager({ API_BASE }) {
  const [contacts, setContacts] = useState({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contacts`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || {});
      }
    } catch (err) {
      console.error("Failed to fetch contacts", err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [API_BASE]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() })
      });
      if (res.ok) {
        window.showToast(`Contacto ${name} guardado`);
        setName('');
        setPhone('');
        fetchContacts();
      }
    } catch (err) {
      console.error("Failed to save contact", err);
      window.showToast("Error al guardar contacto", "error");
    }
    setLoading(false);
  };

  const handleDelete = async (contactName) => {
    if (!window.confirm(`¿Seguro que quieres borrar a ${contactName}? Habana ya no podrá mandarle WhatsApps.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/contacts/${encodeURIComponent(contactName)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        window.showToast(`Contacto ${contactName} borrado`);
        fetchContacts();
      }
    } catch (err) {
      console.error("Failed to delete contact", err);
    }
  };

  return (
    <div className="panel" style={{ marginTop: '1.5rem', background: '#0a0a0a', border: '1px solid #333' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00ff9d', marginBottom: '1rem' }}>
        <Users size={20} />
        Agenda de Contactos (WhatsApp)
      </h2>
      <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Añade personas aquí para que Habana sepa a quién escribir de forma proactiva. 
        <br />
        <strong style={{ color: '#ffeb3b' }}>Importante:</strong> El número debe incluir el prefijo del país sin el símbolo + (Ej: 34600112233).
      </p>

      {/* Formulario */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Nombre (ej. Lupe)" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: '1 1 150px', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.75rem', borderRadius: '4px' }}
          required 
        />
        <input 
          type="text" 
          placeholder="Teléfono (ej. 346...)" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ flex: '1 1 200px', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.75rem', borderRadius: '4px' }}
          required 
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: '#00ff9d', color: '#000', fontWeight: 'bold', 
            padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            opacity: loading ? 0.7 : 1
          }}
        >
          <UserPlus size={18} />
          {loading ? 'Guardando...' : 'Añadir / Actualizar'}
        </button>
      </form>

      {/* Lista de Contactos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Object.keys(contacts).length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem', border: '1px dashed #333', borderRadius: '4px' }}>
            La agenda está vacía. Añade tu primer contacto arriba.
          </div>
        ) : (
          Object.entries(contacts).map(([contactName, contactPhone]) => (
            <div key={contactName} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              background: '#151515', padding: '1rem', borderRadius: '4px', border: '1px solid #222'
            }}>
              <div>
                <strong style={{ display: 'block', color: '#fff', fontSize: '1rem', marginBottom: '0.25rem' }}>{contactName}</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#888', fontSize: '0.85rem' }}>
                  <Phone size={14} /> {contactPhone}
                </span>
              </div>
              <button 
                onClick={() => handleDelete(contactName)}
                style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.5rem' }}
                title={`Borrar a ${contactName}`}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
