import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export default function useAllies() {
  const [allies, setAllies] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAllies() {
    setLoading(true);
    try {
      const q = query(collection(db, 'allies'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAllies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching allies:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAllies();
  }, []);

  async function addAllie(data) {
    const docRef = await addDoc(collection(db, 'allies'), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    setAllies(prev => [{ id: docRef.id, ...data, createdAt: new Date().toISOString() }, ...prev]);
  }

  async function updateAllie(id, data) {
    await updateDoc(doc(db, 'allies', id), data);
    setAllies(prev => prev.map(a => (a.id === id ? { ...a, ...data } : a)));
  }

  async function deleteAllie(id) {
    await deleteDoc(doc(db, 'allies', id));
    setAllies(prev => prev.filter(a => a.id !== id));
  }

  return { allies, loading, addAllie, updateAllie, deleteAllie, refresh: fetchAllies };
}
