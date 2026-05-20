const webpush = require('web-push');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@nexus.app',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

/**
 * Send push notification to a single subscription
 */
const sendPush = async (subscription, payload) => {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 86400, // 24 hours
        urgency: 'high',
      }
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired/removed
      return 'expired';
    }
    logger.error('Push send failed:', err.message);
    return false;
  }
};

/**
 * Send push notifications to multiple users
 */
const pushNotificationToUsers = async (users, payload) => {
  const results = [];

  for (const user of users) {
    if (!user.pushSubscriptions?.length) continue;
    if (user.settings?.notifications?.messages === false) continue;

    const notification = await Notification.create({
      recipient: user._id,
      type: payload.data?.type || 'message',
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });

    const validSubs = [];
    for (const sub of user.pushSubscriptions) {
      const result = await sendPush(sub, {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/badge-72.png',
        tag: payload.tag,
        data: { ...payload.data, notificationId: notification._id },
        actions: [
          { action: 'reply', title: 'Reply' },
          { action: 'open', title: 'Open' },
        ],
        vibrate: [100, 50, 100],
      });

      if (result === 'expired') {
        // Don't keep expired subs (handled in user route)
      } else if (result) {
        validSubs.push(sub);
        notification.pushed = true;
      }
    }

    await notification.save();
    results.push({ userId: user._id, pushed: notification.pushed });
  }

  return results;
};

/**
 * Send notification to a specific user by ID
 */
const pushToUser = async (User, userId, payload) => {
  const user = await User.findById(userId).select('pushSubscriptions settings name');
  if (!user) return;
  return pushNotificationToUsers([user], payload);
};

module.exports = { pushNotificationToUsers, pushToUser, sendPush };
