"use strict";

const cron = require("node-cron");
const RecommendationSnapshot = require("../models/RecommendationSnapshot");
const { generateRecommendationsForUser } = require("../services/recommendationGeneration.service");

const SCHEDULE = "0 */6 * * *"; // кожні 6 годин

const regenerateStaleSnapshots = async () => {
  console.log("[scheduler] Перевірка застарілих snapshot'ів...");

  const now = new Date();

  let stale;
  try {
    stale = await RecommendationSnapshot.find({
      $or: [
        { validUntil: { $lte: now } },
        { status: "stale" },
      ],
    }).select("userId").lean();
  } catch (err) {
    console.error("[scheduler] Помилка при отриманні списку snapshot'ів:", err.message);
    return;
  }

  if (!stale.length) {
    console.log("[scheduler] Застарілих snapshot'ів не знайдено.");
    return;
  }

  console.log(`[scheduler] Знайдено ${stale.length} застарілих snapshot'ів. Починаємо регенерацію...`);

  let success = 0;
  let failed = 0;

  for (const { userId } of stale) {
    try {
      await generateRecommendationsForUser(userId);
      success++;
    } catch (err) {
      console.error(`[scheduler] Не вдалося регенерувати snapshot для userId=${userId}:`, err.message);
      failed++;
    }
  }

  console.log(`[scheduler] Завершено. Успішно: ${success}, з помилками: ${failed}.`);
};

let task = null;

exports.startRecommendationScheduler = () => {
  task = cron.schedule(SCHEDULE, regenerateStaleSnapshots, { scheduled: true });
  console.log("[scheduler] Планувальник рекомендацій запущено (кожні 6 годин).");
  regenerateStaleSnapshots();
};

exports.stopRecommendationScheduler = () => {
  if (task) {
    task.stop();
    console.log("[scheduler] Планувальник рекомендацій зупинено.");
  }
};
