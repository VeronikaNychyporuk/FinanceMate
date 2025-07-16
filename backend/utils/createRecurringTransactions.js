const cron = require("node-cron");
const RecurringTransaction = require("../models/RecurringTransaction");
const Notification = require("../models/Notification");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const { createUserTransaction } = require("../services/transaction.service");
const dayjs = require("dayjs"); // для зручної роботи з датами

// планувальник — запуск щоденно о 02:00 ночі
cron.schedule("0 2 * * *", async () => {
  console.log("⏰ Перевірка регулярних платежів...");

  try {
    const startOfToday = dayjs().startOf("day").toDate();
    const endOfToday = dayjs().endOf("day").toDate();

    const recurringTransactions = await RecurringTransaction.find({
      isActive: true,
      nextRun: { $gte: startOfToday, $lte: endOfToday },
    });

    for (const recurring of recurringTransactions) {
      // Створюємо звичайну транзакцію
      await createUserTransaction(recurring.userId, {
        amount: recurring.amount,
        currency: recurring.currency,
        type: recurring.type,
        categoryId: recurring.categoryId,
        note: recurring.note,
        date: recurring.nextRun,
      });

      //Стоврення сповіщення про створення транзакції
      const category = await Category.findById(recurring.categoryId).select("name");
      const categoryName = category?.name || "Невідома категорія";
      const userId = recurring.userId.toString();
      await Notification.create({
        userId,
        type: "system",
        message: `Додано регулярну транзакцію на суму ${recurring.amount}${recurring.currency} у категорії "${categoryName}".`,
        status: "unread",
      });

      // Обчислюємо наступну дату
      let nextDate = dayjs(recurring.nextRun);
      switch (recurring.frequency) {
        case "daily":
          nextDate = nextDate.add(1, "day");
          break;
        case "weekly":
          nextDate = nextDate.add(1, "week");
          break;
        case "monthly":
          nextDate = nextDate.add(1, "month");
          break;
        case "yearly":
          nextDate = nextDate.add(1, "year");
          break;
      }

      // Якщо є кінець періоду — перевірка
      if (recurring.endDate && nextDate.isAfter(recurring.endDate)) {
        recurring.isActive = false;
      } else {
        recurring.nextRun = nextDate.toDate();
      }

      await recurring.save();
    }

    console.log(`✅ Опрацьовано ${recurringTransactions.length} регулярних платежів.`);
  } catch (error) {
    console.error("❌ Помилка при створенні регулярних платежів:", error.message);
  }
});
