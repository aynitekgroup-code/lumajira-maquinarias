import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../supabase/config';

const isNative = Capacitor.isNativePlatform();

async function saveToken(user, token) {
  await supabase
    .from('users')
    .upsert({
      id: user.id,
      fcm_token: token,
      notifications_enabled: true,
      platform: isNative ? 'android' : 'web',
    }, { onConflict: 'id' });
}

async function requestNativeNotifications(user) {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return null;

  return new Promise((resolve) => {
    const regHandler = PushNotifications.addListener('registration', async (token) => {
      await saveToken(user, token.value);
      regHandler.remove();
      errHandler.remove();
      resolve(token.value);
    });

    const errHandler = PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
      regHandler.remove();
      errHandler.remove();
      resolve(null);
    });

    PushNotifications.register();
  });
}

async function requestWebNotifications(user) {
  if (!('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const { data, error } = await supabase.functions.invoke('send-web-notification', {
    body: { user_id: user.id },
  });
  if (error) return null;
  return data?.token || null;
}

export async function requestNotificationPermission(user) {
  if (!user) return null;

  try {
    if (isNative) {
      return await requestNativeNotifications(user);
    }
    return await requestWebNotifications(user);
  } catch (err) {
    console.error('Error al obtener token:', err);
    return null;
  }
}

export function onMessageListener() {
  if (isNative) {
    const handles = [];
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push recibido:', notification);
    }).then((h) => handles.push(h));
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
    }).then((h) => handles.push(h));
    return () => {
      handles.forEach((h) => h.remove());
    };
  }

  return () => {};
}

export async function disableNotifications(user) {
  if (!user) return;
  try {
    if (isNative) {
      await PushNotifications.removeAllListeners();
    }
    await supabase
      .from('users')
      .update({
        notifications_enabled: false,
        fcm_token: null,
      })
      .eq('id', user.id);
  } catch (err) {
    console.error('Error al desactivar notificaciones:', err);
  }
}

export function initNativePushListeners(user, onToken) {
  if (!isNative || !user) return () => {};

  PushNotifications.addListener('registration', async (token) => {
    await saveToken(user, token.value);
    onToken?.(token.value);
  });

  return () => {};
}
