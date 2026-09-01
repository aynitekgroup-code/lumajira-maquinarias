import { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';

export default function useAllies() {
  const [allies, setAllies] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAllies() {
    setLoading(true);
    const { data, error } = await supabase
      .from('allies')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setAllies(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAllies();
  }, []);

  async function addAllie(data) {
    const { data: newAlly, error } = await supabase
      .from('allies')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    setAllies(prev => [newAlly, ...prev]);
  }

  async function updateAllie(id, data) {
    const { error } = await supabase
      .from('allies')
      .update(data)
      .eq('id', id);
    if (error) throw error;
    setAllies(prev => prev.map(a => (a.id === id ? { ...a, ...data } : a)));
  }

  async function deleteAllie(id) {
    const { error } = await supabase
      .from('allies')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setAllies(prev => prev.filter(a => a.id !== id));
  }

  return { allies, loading, addAllie, updateAllie, deleteAllie, refresh: fetchAllies };
}
