import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { messaging, db } from '../firebase/config';

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';
const isNative = Capacitor.isNativePlatform();

async function saveToken(user, token) {
  await setDoc(
    doc(db, 'users', user.uid),
    { fcmToken: token, notificationsEnabled: true, platform: isNative ? 'android' : 'web' },
    { merge: true }
  );
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
  if (!messaging) return null;
  if (!('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  if (token) {
    await saveToken(user, token);
    return token;
  }
  return null;
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

  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'LumaControl', {
        body: payload.notification?.body || '',
        icon: '/team.png.png',
      });
    }
  });
}

export async function disableNotifications(user) {
  if (!user) return;
  try {
    if (isNative) {
      await PushNotifications.removeAllListeners();
    }
    await updateDoc(doc(db, 'users', user.uid), {
      notificationsEnabled: false,
      fcmToken: null,
    });
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
