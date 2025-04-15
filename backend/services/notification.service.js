const Notification = require("../models/Notification");

exports.getUserNotifications = async (userId) => {
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

  return notifications.map((n) => ({
    id: n._id,
    message: n.message,
    type: n.type,
    status: n.status,
    createdAt: n.createdAt,
  }));
};

exports.markNotificationAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId: userId,
  });

  if (!notification) {
    throw new Error("Сповіщення не знайдено або не належить користувачу.");
  }

  if (notification.status === "read") return;

  notification.status = "read";
  await notification.save();
};

exports.removeNotification = async (userId, notificationId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new Error("Сповіщення не знайдено або не належить користувачу.");
  }
};
