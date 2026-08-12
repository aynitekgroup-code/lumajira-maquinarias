importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDNe1rXfCbN8VoBiomBTYrAj8cCxLoIB94',
  authDomain: 'lumajiramaquinarias-d273c.firebaseapp.com',
  databaseURL: 'https://lumajiramaquinarias-d273c-default-rtdb.firebaseio.com',
  projectId: 'lumajiramaquinarias-d273c',
  storageBucket: 'lumajiramaquinarias-d273c.firebasestorage.app',
  messagingSenderId: '674187311901',
  appId: '1:674187311901:web:dc4e013a9c94e44124bff4',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Lumajira Maquinarias';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/team.png.png',
    badge: '/team.png.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
