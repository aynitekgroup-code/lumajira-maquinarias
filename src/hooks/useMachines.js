import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

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
      const q = query(collection(db, 'machines'), where('ownerId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      const docRef = await addDoc(collection(db, 'machines'), {
        name: newMachineName.trim(),
        ownerId: user.uid,
        rtdbId: user.uid,
        createdAt: new Date().toISOString(),
        sensors: [{ type: 'SCT-013', name: 'Corriente Resistencias Banda', unit: 'A' }],
      });
      const newM = { id: docRef.id, name: newMachineName.trim(), rtdbId: user.uid };
      setMachines((prev) => [...prev, newM]);
      setSelectedMachine(newM);
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
      const imgRef = storageRef(storage, `machines/${machine.id}/photo.${ext}`);
      await uploadBytes(imgRef, file);
      const url = await getDownloadURL(imgRef);
      await updateDoc(doc(db, 'machines', machine.id), { imageUrl: url });
      const updated = { ...machine, imageUrl: url };
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
