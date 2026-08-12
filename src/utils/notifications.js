import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase/config';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

export async function requestNotificationPermission(user) {
  if (!user) return null;
  if (!messaging) return null;

  try {
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permiso de notificaciones denegado.');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      await setDoc(
        doc(db, 'users', user.uid),
        { fcmToken: token, notificationsEnabled: true },
        { merge: true }
      );
      console.log('Token FCM guardado.');
      return token;
    }
    return null;
  } catch (err) {
    console.error('Error al obtener token FCM:', err);
    return null;
  }
}

export function onMessageListener() {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('Mensaje recibido:', payload);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'Lumajira', {
        body: payload.notification?.body || '',
        icon: '/team.png.png',
      });
    }
  });
}

export async function disableNotifications(user) {
  if (!user) return;
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      notificationsEnabled: false,
      fcmToken: null,
    });
  } catch (err) {
    console.error('Error al desactivar notificaciones:', err);
  }
}
