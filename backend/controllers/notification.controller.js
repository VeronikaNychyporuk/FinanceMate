const { 
    getUserNotifications,
    markNotificationAsRead,
    removeNotification,
} = require("../services/notification.service");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.userId);
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Помилка при отриманні сповіщень." });
  }
};

exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.userId;

  try {
    await markNotificationAsRead(userId, notificationId);
    res.status(200).json({ message: "Сповіщення позначено як прочитане." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteNotification = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.userId;

  try {
    await removeNotification(userId, notificationId);
    res.status(200).json({ message: "Сповіщення видалено." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
