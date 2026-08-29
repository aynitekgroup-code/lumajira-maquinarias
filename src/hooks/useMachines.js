import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/config';

export function useMachines(user, showToast) {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadMachines = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = data || [];
      setMachines(list);
      setSelectedMachine((prev) => {
        if (prev && list.some((m) => m.id === prev.id)) return prev;
        return list[0] || null;
      });
    } catch (err) {
      console.error(err);
      showToast?.('Error al cargar maquinas', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  async function addMachine() {
    if (!newMachineName.trim() || !user) return;
    try {
      const { data, error } = await supabase
        .from('machines')
        .insert({
          name: newMachineName.trim(),
          owner_id: user.id,
          rtdb_id: user.id,
          created_at: new Date().toISOString(),
          sensors: [{ type: 'SCT-013', name: 'Corriente Resistencias Banda', unit: 'A' }],
        })
        .select()
        .single();
      if (error) throw error;
      setMachines((prev) => [...prev, data]);
      setSelectedMachine(data);
      setNewMachineName('');
      setShowAddMachine(false);
      showToast?.('Maquina agregada', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al agregar maquina', 'error');
    }
  }

  async function uploadMachineImage(file, machine) {
    if (!file || !machine) return;
    if (!file.type.startsWith('image/')) {
      showToast?.('Solo se permiten imagenes (jpg, png)', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast?.('La imagen no debe superar 5MB', 'warning');
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `machines/${machine.id}/photo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('machine-images')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('machine-images')
        .getPublicUrl(filePath);
      const url = urlData.publicUrl;
      await supabase
        .from('machines')
        .update({ image_url: url })
        .eq('id', machine.id);
      const updated = { ...machine, image_url: url };
      setSelectedMachine((prev) => (prev?.id === machine.id ? updated : prev));
      setMachines((prev) => prev.map((m) => (m.id === machine.id ? updated : m)));
      showToast?.('Imagen actualizada', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al subir imagen', 'error');
    } finally {
      setUploadingImage(false);
    }
  }

  return {
    machines,
    selectedMachine,
    setSelectedMachine,
    loading,
    showAddMachine,
    setShowAddMachine,
    newMachineName,
    setNewMachineName,
    uploadingImage,
    addMachine,
    uploadMachineImage,
    reloadMachines: loadMachines,
  };
}
