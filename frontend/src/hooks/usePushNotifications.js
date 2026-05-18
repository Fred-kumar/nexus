import { useEffect } from 'react';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const SERVICE_WORKER_URL = '/sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export const usePushNotifications = () => {
  const setupPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
      console.log('✅ Service Worker registered');

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      // Get VAPID key
      const { publicKey } = await userAPI.getVapidKey();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Save subscription to server
      await userAPI.savePushSubscription(subscription.toJSON());
      console.log('✅ Push notifications enabled');
      toast.success('Push notifications enabled! 🔔');
    } catch (err) {
      console.error('Push setup error:', err);
    }
  };

  return { setupPush };
};

// Service Worker handler (called from usePushNotifications on mount)
export const initializePushNotifications = async (isAuthenticated) => {
  if (!isAuthenticated) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      // Already subscribed, save to server (in case of re-login)
      await userAPI.savePushSubscription(sub.toJSON());
    }
  } catch (e) {}
};
