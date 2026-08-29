import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        } else {
          setUser(null);
          setUserData(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setUserData(data);
  }

  async function register(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        name,
        email,
        role: 'operator',
        created_at: new Date().toISOString(),
      });
      setUserData({ id: data.user.id, name, email, role: 'operator' });
    }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setUserData(null);
  }

  const isAdmin = useMemo(() => {
    return userData?.role === 'admin' || user?.email === 'aynitek.group@gmail.com';
  }, [userData, user]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, register, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
