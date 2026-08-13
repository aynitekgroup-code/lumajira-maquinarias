import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initNativeUI() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setBackgroundColor({ color: '#0a1628' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (err) {
    console.log('StatusBar not available:', err.message);
  }
}
