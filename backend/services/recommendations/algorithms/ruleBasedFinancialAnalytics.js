const DAY_MS = 24 * 60 * 60 * 1000;

const round = (value) => Number((value || 0).toFixed(2));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const buildDateRange = (days, now = new Date()) => ({
  from: addDays(startOfDay(now), -(days - 1)),
  to: now,
});

const filterTransactionsByPeriod = (transactions, from, to = new Date()) =>
  transactions.filter((tx) => tx.date >= from && tx.date <= to);

const sumTransactionsByType = (transactions, type) =>
  round(
    transactions
      .filter((tx) => tx.type === type)
      .reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0)
  );

const groupExpenseByCategory = (transactions) => {
  const map = new Map();

  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const categoryId =
        tx.categoryId?._id?.toString() ||
        tx.categoryId?.toString() ||
        "unknown";

      const categoryName = tx.categoryId?.name || "Без категорії";

      const current = map.get(categoryId) || {
        categoryId,
        categoryName,
        amount: 0,
        count: 0,
      };

      current.amount += tx.amountInBaseCurrency;
      current.count += 1;

      map.set(categoryId, current);
    });

  return [...map.values()]
    .map((item) => ({
      ...item,
      amount: round(item.amount),
    }))
    .sort((a, b) => b.amount - a.amount);
};

const buildOverviewPeriod = (transactions, days, now = new Date()) => {
  const { from, to } = buildDateRange(days, now);
  const periodTransactions = filterTransactionsByPeriod(transactions, from, to);

  const income = sumTransactionsByType(periodTransactions, "income");
  const expense = sumTransactionsByType(periodTransactions, "expense");
  const net = round(income - expense);

  const categoryBreakdown = groupExpenseByCategory(periodTransactions);
  const topDrivers = categoryBreakdown.slice(0, 3).map((item) => ({
    categoryId: item.categoryId,
    category: item.categoryName,
    amount: item.amount,
    share: expense > 0 ? round((item.amount / expense) * 100) : 0,
    count: item.count,
  }));

  return {
    label: `${days} днів`,
    days,
    from,
    to,
    income,
    expense,
    net,
    transactionCount: periodTransactions.length,
    categoryBreakdown: categoryBreakdown.map((item) => ({
      categoryId: item.categoryId,
      category: item.categoryName,
      amount: item.amount,
      count: item.count,
      share: expense > 0 ? round((item.amount / expense) * 100) : 0,
    })),
    topDrivers,
  };
};

const calculateTrend = (currentValue, previousValue) => {
  const diff = currentValue - previousValue;

  if (previousValue === 0) {
    return {
      absoluteChange: round(diff),
      percentChange: currentValue > 0 ? 100 : 0,
    };
  }

  return {
    absoluteChange: round(diff),
    percentChange: round((diff / previousValue) * 100),
  };
};

const buildComparisonPeriod = (transactions, days, now = new Date()) => {
  const currentFrom = addDays(startOfDay(now), -(days - 1));
  const previousTo = addDays(currentFrom, -1);
  const previousFrom = addDays(previousTo, -(days - 1));

  const currentTransactions = filterTransactionsByPeriod(
    transactions,
    currentFrom,
    now
  );
  const previousTransactions = filterTransactionsByPeriod(
    transactions,
    previousFrom,
    previousTo
  );

  const currentIncome = sumTransactionsByType(currentTransactions, "income");
  const currentExpense = sumTransactionsByType(currentTransactions, "expense");
  const currentNet = round(currentIncome - currentExpense);

  const previousIncome = sumTransactionsByType(previousTransactions, "income");
  const previousExpense = sumTransactionsByType(previousTransactions, "expense");
  const previousNet = round(previousIncome - previousExpense);

  return {
    days,
    current: {
      from: currentFrom,
      to: now,
      income: currentIncome,
      expense: currentExpense,
      net: currentNet,
      transactionCount: currentTransactions.length,
    },
    previous: {
      from: previousFrom,
      to: previousTo,
      income: previousIncome,
      expense: previousExpense,
      net: previousNet,
      transactionCount: previousTransactions.length,
    },
    trends: {
      income: calculateTrend(currentIncome, previousIncome),
      expense: calculateTrend(currentExpense, previousExpense),
      net: calculateTrend(currentNet, previousNet),
    },
  };
};

const buildMonthlyBudgetAnalysis = (budget, expenseTransactions, now = new Date()) => {
  if (!budget) {
    return null;
  }

  const monthStart = new Date(budget.period.year, budget.period.month - 1, 1);
  const monthEnd = new Date(budget.period.year, budget.period.month, 1);

  const monthExpenses = expenseTransactions.filter(
    (tx) => tx.date >= monthStart && tx.date < monthEnd
  );

  const totalSpent = round(
    monthExpenses.reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0)
  );

  const usagePercent =
    budget.totalLimit > 0 ? round((totalSpent / budget.totalLimit) * 100) : 0;

  const daysInMonth = new Date(
    budget.period.year,
    budget.period.month,
    0
  ).getDate();

  const currentDay =
    now.getMonth() + 1 === budget.period.month && now.getFullYear() === budget.period.year
      ? now.getDate()
      : daysInMonth;

  const elapsedShare = round((currentDay / daysInMonth) * 100);

  const categoryUsage = (budget.categoryLimits || []).map((limitItem) => {
    const spent = round(
      monthExpenses
        .filter((tx) => {
          const txCategoryId =
            tx.categoryId?._id?.toString() || tx.categoryId?.toString();
          const limitCategoryId =
            limitItem.categoryId?._id?.toString() || limitItem.categoryId?.toString();

          return txCategoryId === limitCategoryId;
        })
        .reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0)
    );

    const usage =
      limitItem.limit > 0 ? round((spent / limitItem.limit) * 100) : 0;

    return {
      categoryId:
        limitItem.categoryId?._id?.toString() || limitItem.categoryId?.toString() || null,
      category: limitItem.categoryId?.name || "Без категорії",
      limit: round(limitItem.limit),
      spent,
      usagePercent: usage,
      remaining: round(limitItem.limit - spent),
    };
  });

  return {
    month: budget.period.month,
    year: budget.period.year,
    totalLimit: round(budget.totalLimit),
    totalSpent,
    usagePercent,
    remaining: round(budget.totalLimit - totalSpent),
    elapsedMonthPercent: elapsedShare,
    categoryUsage: categoryUsage.sort((a, b) => b.usagePercent - a.usagePercent),
  };
};

const detectDataSufficiency = (transactions) => {
  const transactionCount = transactions.length;

  if (transactionCount >= 20) {
    return {
      level: "high",
      isEnough: true,
      transactionCount,
    };
  }

  if (transactionCount >= 8) {
    return {
      level: "medium",
      isEnough: true,
      transactionCount,
    };
  }

  return {
    level: "low",
    isEnough: false,
    transactionCount,
  };
};

const buildSignal = ({
  signalType,
  severity,
  confidence,
  title,
  summary,
  metrics,
  thresholds,
  relatedEntity = null,
}) => ({
  signalType,
  severity,
  confidence,
  title,
  summary,
  metrics,
  thresholds,
  relatedEntity,
});

const buildFinding = ({
  type,
  priority,
  title,
  message,
  facts,
  explanation,
  relatedEntity = null,
  primaryAction = null,
  secondaryAction = null,
  context,
}) => ({
  type,
  module: "overview",
  priority,
  title,
  message,
  facts,
  explanation,
  relatedEntity,
  primaryAction,
  secondaryAction,
  context,
});

const analyzeRuleBasedFinancials = ({
  transactions,
  expenseTransactions,
  budget,
  now = new Date(),
}) => {
  const dataSufficiency = detectDataSufficiency(transactions);

  const overview7 = buildOverviewPeriod(transactions, 7, now);
  const overview30 = buildOverviewPeriod(transactions, 30, now);
  const overview90 = buildOverviewPeriod(transactions, 90, now);

  const comparison30 = buildComparisonPeriod(transactions, 30, now);
  const budgetAnalysis = buildMonthlyBudgetAnalysis(budget, expenseTransactions, now);

  const signals = [];
  const findings = [];

  const expenseTrend = comparison30.trends.expense;
  const incomeTrend = comparison30.trends.income;
  const netTrend = comparison30.trends.net;

  if (
    comparison30.previous.expense > 0 &&
    expenseTrend.percentChange >= 15
  ) {
    const severity =
      expenseTrend.percentChange >= 30 ? "high" : "medium";

    signals.push(
      buildSignal({
        signalType: "expense_growth",
        severity,
        confidence: dataSufficiency.level,
        title: "Зростання витрат",
        summary: `Витрати за останні 30 днів зросли на ${expenseTrend.percentChange}% порівняно з попередніми 30 днями.`,
        metrics: {
          currentExpense: comparison30.current.expense,
          previousExpense: comparison30.previous.expense,
          percentChange: expenseTrend.percentChange,
          absoluteChange: expenseTrend.absoluteChange,
        },
        thresholds: {
          percentChangeWarning: 15,
          percentChangeCritical: 30,
        },
      })
    );

    findings.push(
      buildFinding({
        type: "trend_change",
        priority: severity,
        title: "Витрати зростають швидше, ніж раніше",
        message: `За останні 30 днів витрати зросли на ${expenseTrend.percentChange}% порівняно з попереднім 30-денним періодом. Варто переглянути останні категорії витрат і знайти джерело цього зростання.`,
        facts: [
          `Поточні витрати: ${comparison30.current.expense}`,
          `Попередні витрати: ${comparison30.previous.expense}`,
          `Зміна: +${expenseTrend.percentChange}%`,
        ],
        explanation:
          "Рекомендація сформована за правилом порівняння витрат у двох послідовних 30-денних періодах.",
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: {
          label: "До патернів витрат",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "patterns",
        },
        context: {
          algorithm: "rule_based_financial_analytics",
          signalType: "expense_growth",
          period: "30d_vs_prev_30d",
          metrics: {
            currentExpense: comparison30.current.expense,
            previousExpense: comparison30.previous.expense,
            percentChange: expenseTrend.percentChange,
            absoluteChange: expenseTrend.absoluteChange,
          },
          thresholds: {
            percentChangeWarning: 15,
            percentChangeCritical: 30,
          },
          confidence: dataSufficiency.level,
        },
      })
    );
  }

  if (
    comparison30.previous.income > 0 &&
    incomeTrend.percentChange <= -15
  ) {
    const severity =
      incomeTrend.percentChange <= -30 ? "high" : "medium";

    signals.push(
      buildSignal({
        signalType: "income_drop",
        severity,
        confidence: dataSufficiency.level,
        title: "Зниження доходів",
        summary: `Доходи за останні 30 днів зменшилися на ${Math.abs(
          incomeTrend.percentChange
        )}% порівняно з попередніми 30 днями.`,
        metrics: {
          currentIncome: comparison30.current.income,
          previousIncome: comparison30.previous.income,
          percentChange: incomeTrend.percentChange,
          absoluteChange: incomeTrend.absoluteChange,
        },
        thresholds: {
          percentChangeWarning: -15,
          percentChangeCritical: -30,
        },
      })
    );

    findings.push(
      buildFinding({
        type: "trend_change",
        priority: severity,
        title: "Доходи знизилися порівняно з попереднім періодом",
        message: `За останні 30 днів доходи зменшилися на ${Math.abs(
          incomeTrend.percentChange
        )}% відносно попереднього періоду. Варто уважніше контролювати витрати, поки дохід не стабілізується.`,
        facts: [
          `Поточні доходи: ${comparison30.current.income}`,
          `Попередні доходи: ${comparison30.previous.income}`,
          `Зміна: ${incomeTrend.percentChange}%`,
        ],
        explanation:
          "Рекомендація сформована на основі динаміки доходів у двох послідовних 30-денних періодах.",
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: null,
        context: {
          algorithm: "rule_based_financial_analytics",
          signalType: "income_drop",
          period: "30d_vs_prev_30d",
          metrics: {
            currentIncome: comparison30.current.income,
            previousIncome: comparison30.previous.income,
            percentChange: incomeTrend.percentChange,
            absoluteChange: incomeTrend.absoluteChange,
          },
          thresholds: {
            percentChangeWarning: -15,
            percentChangeCritical: -30,
          },
          confidence: dataSufficiency.level,
        },
      })
    );
  }

  if (overview30.net < 0) {
    const severity = overview30.expense > overview30.income * 1.15 ? "high" : "medium";

    signals.push(
      buildSignal({
        signalType: "negative_balance",
        severity,
        confidence: dataSufficiency.level,
        title: "Негативний баланс",
        summary: "За останні 30 днів витрати перевищили доходи.",
        metrics: {
          income: overview30.income,
          expense: overview30.expense,
          net: overview30.net,
        },
        thresholds: {
          negativeNetBoundary: 0,
        },
      })
    );

    findings.push(
      buildFinding({
        type: "balance_warning",
        priority: severity,
        title: "Витрати вже перевищують доходи",
        message:
          "За останні 30 днів витрати перевищили доходи, через що сформувався від’ємний чистий баланс. Варто скоригувати поточні витрати, щоб стабілізувати фінансовий стан.",
        facts: [
          `Доходи: ${overview30.income}`,
          `Витрати: ${overview30.expense}`,
          `Нетто: ${overview30.net}`,
        ],
        explanation:
          "Рекомендація сформована на основі співвідношення доходів і витрат за останні 30 днів.",
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: {
          label: "Відкрити прогноз",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "forecast",
        },
        context: {
          algorithm: "rule_based_financial_analytics",
          signalType: "negative_balance",
          period: "last_30_days",
          metrics: {
            income: overview30.income,
            expense: overview30.expense,
            net: overview30.net,
          },
          thresholds: {
            negativeNetBoundary: 0,
          },
          confidence: dataSufficiency.level,
        },
      })
    );
  }

  if (
    comparison30.previous.net > 0 &&
    netTrend.percentChange <= -20
  ) {
    const severity =
      netTrend.percentChange <= -40 ? "high" : "medium";

    signals.push(
      buildSignal({
        signalType: "balance_deterioration",
        severity,
        confidence: dataSufficiency.level,
        title: "Погіршення чистого балансу",
        summary: "Чистий баланс став гіршим порівняно з попереднім 30-денним періодом.",
        metrics: {
          currentNet: comparison30.current.net,
          previousNet: comparison30.previous.net,
          percentChange: netTrend.percentChange,
          absoluteChange: netTrend.absoluteChange,
        },
        thresholds: {
          percentChangeWarning: -20,
          percentChangeCritical: -40,
        },
      })
    );

    findings.push(
      buildFinding({
        type: "trend_change",
        priority: severity,
        title: "Фінансовий баланс погіршився",
        message: `Чистий баланс за останні 30 днів став гіршим на ${Math.abs(
          netTrend.percentChange
        )}% порівняно з попереднім періодом. Це означає, що запас фінансової стійкості зменшився.`,
        facts: [
          `Поточне нетто: ${comparison30.current.net}`,
          `Попереднє нетто: ${comparison30.previous.net}`,
          `Зміна: ${netTrend.percentChange}%`,
        ],
        explanation:
          "Рекомендація виникає тоді, коли чистий баланс істотно погіршується відносно попереднього аналогічного періоду.",
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: {
          label: "Відкрити прогноз",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "forecast",
        },
        context: {
          algorithm: "rule_based_financial_analytics",
          signalType: "balance_deterioration",
          period: "30d_vs_prev_30d",
          metrics: {
            currentNet: comparison30.current.net,
            previousNet: comparison30.previous.net,
            percentChange: netTrend.percentChange,
            absoluteChange: netTrend.absoluteChange,
          },
          thresholds: {
            percentChangeWarning: -20,
            percentChangeCritical: -40,
          },
          confidence: dataSufficiency.level,
        },
      })
    );
  }

  const dominantCategory = overview30.topDrivers[0] || null;

  if (dominantCategory && dominantCategory.share >= 35) {
    const priority = dominantCategory.share >= 50 ? "high" : "medium";

    signals.push(
      buildSignal({
        signalType: "dominant_category",
        severity: priority,
        confidence: dataSufficiency.level,
        title: "Домінантна категорія витрат",
        summary: `Категорія «${dominantCategory.category}» формує ${dominantCategory.share}% усіх витрат за останні 30 днів.`,
        metrics: {
          category: dominantCategory.category,
          amount: dominantCategory.amount,
          share: dominantCategory.share,
          transactionCount: dominantCategory.count,
        },
        thresholds: {
          dominantShareWarning: 35,
          dominantShareCritical: 50,
        },
        relatedEntity: dominantCategory.categoryId
          ? {
              entityType: "category",
              entityId: dominantCategory.categoryId,
              label: dominantCategory.category,
            }
          : null,
      })
    );

    findings.push(
      buildFinding({
        type: "spending_optimization",
        priority,
        title: `Категорія «${dominantCategory.category}» формує найбільшу частку витрат`,
        message: `За останні 30 днів категорія «${dominantCategory.category}» становить ${dominantCategory.share}% усіх витрат. Саме в цій категорії доцільно шукати найбільший резерв для оптимізації.`,
        facts: [
          `Категорія: ${dominantCategory.category}`,
          `Сума: ${dominantCategory.amount}`,
          `Частка: ${dominantCategory.share}%`,
        ],
        explanation:
          "Рекомендація базується на аналізі структури витрат і виявленні категорії з найбільшою часткою в загальному обсязі витрат.",
        relatedEntity: dominantCategory.categoryId
          ? {
              entityType: "category",
              entityId: dominantCategory.categoryId,
              label: dominantCategory.category,
            }
          : null,
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: {
          label: "До патернів витрат",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "patterns",
        },
        context: {
          algorithm: "rule_based_financial_analytics",
          signalType: "dominant_category",
          period: "last_30_days",
          metrics: {
            category: dominantCategory.category,
            amount: dominantCategory.amount,
            share: dominantCategory.share,
            transactionCount: dominantCategory.count,
          },
          thresholds: {
            dominantShareWarning: 35,
            dominantShareCritical: 50,
          },
          confidence: dataSufficiency.level,
        },
      })
    );
  }

  if (budgetAnalysis) {
    if (budgetAnalysis.usagePercent >= 100) {
      const priority =
        budgetAnalysis.usagePercent >= 115 ? "high" : "medium";

      signals.push(
        buildSignal({
          signalType: "budget_over_limit",
          severity: priority,
          confidence: "high",
          title: "Перевищення місячного бюджету",
          summary: `Місячний бюджет вже перевищено на ${round(
            budgetAnalysis.usagePercent - 100
          )}%.`,
          metrics: {
            totalLimit: budgetAnalysis.totalLimit,
            totalSpent: budgetAnalysis.totalSpent,
            usagePercent: budgetAnalysis.usagePercent,
            remaining: budgetAnalysis.remaining,
          },
          thresholds: {
            overLimitBoundary: 100,
          },
        })
      );

      findings.push(
        buildFinding({
          type: "budget_risk",
          priority,
          title: "Місячний бюджет уже перевищено",
          message: `Фактичні витрати склали ${budgetAnalysis.usagePercent}% від місячного бюджету. Це означає, що ліміт уже перевищено і витрати до кінця періоду потребують особливо уважного контролю.`,
          facts: [
            `Ліміт: ${budgetAnalysis.totalLimit}`,
            `Витрачено: ${budgetAnalysis.totalSpent}`,
            `Використано: ${budgetAnalysis.usagePercent}%`,
          ],
          explanation:
            "Рекомендація сформована на основі порівняння фактичних витрат поточного місяця із заданим бюджетним лімітом.",
          primaryAction: {
            label: "Переглянути огляд",
            actionType: "navigate",
            targetType: "tab",
            targetValue: "overview",
          },
          secondaryAction: null,
          context: {
            algorithm: "rule_based_financial_analytics",
            signalType: "budget_over_limit",
            period: "current_month",
            metrics: {
              totalLimit: budgetAnalysis.totalLimit,
              totalSpent: budgetAnalysis.totalSpent,
              usagePercent: budgetAnalysis.usagePercent,
              remaining: budgetAnalysis.remaining,
            },
            thresholds: {
              overLimitBoundary: 100,
            },
            confidence: "high",
          },
        })
      );
    } else if (budgetAnalysis.usagePercent >= 80) {
      const priority =
        budgetAnalysis.usagePercent >= 95 ? "high" : "medium";

      signals.push(
        buildSignal({
          signalType: "budget_near_limit",
          severity: priority,
          confidence: "high",
          title: "Наближення до ліміту бюджету",
          summary: `Використано вже ${budgetAnalysis.usagePercent}% місячного бюджету.`,
          metrics: {
            totalLimit: budgetAnalysis.totalLimit,
            totalSpent: budgetAnalysis.totalSpent,
            usagePercent: budgetAnalysis.usagePercent,
            remaining: budgetAnalysis.remaining,
            elapsedMonthPercent: budgetAnalysis.elapsedMonthPercent,
          },
          thresholds: {
            nearLimitWarning: 80,
            nearLimitCritical: 95,
          },
        })
      );

      findings.push(
        buildFinding({
          type: "budget_risk",
          priority,
          title: "Є ризик перевищення місячного бюджету",
          message: `Поточні витрати вже використали ${budgetAnalysis.usagePercent}% місячного бюджету. Варто скоригувати витрати до завершення місяця, щоб не вийти за встановлений ліміт.`,
          facts: [
            `Ліміт: ${budgetAnalysis.totalLimit}`,
            `Витрачено: ${budgetAnalysis.totalSpent}`,
            `Використано: ${budgetAnalysis.usagePercent}%`,
          ],
          explanation:
            "Рекомендація виникає тоді, коли використання бюджету наближається до критичного рівня ще до завершення поточного місяця.",
          primaryAction: {
            label: "Переглянути огляд",
            actionType: "navigate",
            targetType: "tab",
            targetValue: "overview",
          },
          secondaryAction: null,
          context: {
            algorithm: "rule_based_financial_analytics",
            signalType: "budget_near_limit",
            period: "current_month",
            metrics: {
              totalLimit: budgetAnalysis.totalLimit,
              totalSpent: budgetAnalysis.totalSpent,
              usagePercent: budgetAnalysis.usagePercent,
              remaining: budgetAnalysis.remaining,
              elapsedMonthPercent: budgetAnalysis.elapsedMonthPercent,
            },
            thresholds: {
              nearLimitWarning: 80,
              nearLimitCritical: 95,
            },
            confidence: "high",
          },
        })
      );
    }

    const categoryBudgetFindings = budgetAnalysis.categoryUsage
      .filter((item) => item.usagePercent >= 100 || item.usagePercent >= 85)
      .slice(0, 2);

    categoryBudgetFindings.forEach((item) => {
      const isOverLimit = item.usagePercent >= 100;
      const priority = item.usagePercent >= 115 ? "high" : "medium";

      findings.push(
        buildFinding({
          type: "budget_risk",
          priority,
          title: isOverLimit
            ? `Ліміт категорії «${item.category}» уже перевищено`
            : `Категорія «${item.category}» наближається до ліміту`,
          message: isOverLimit
            ? `У категорії «${item.category}» уже використано ${item.usagePercent}% від встановленого ліміту. Саме ця категорія зараз створює найбільший ризик для бюджету.`
            : `У категорії «${item.category}» уже використано ${item.usagePercent}% ліміту. Варто обмежити витрати в цій категорії до кінця місяця.`,
          facts: [
            `Категорія: ${item.category}`,
            `Ліміт: ${item.limit}`,
            `Витрачено: ${item.spent}`,
          ],
          explanation:
            "Рекомендація сформована на основі аналізу category-level budget usage у межах поточного місяця.",
          relatedEntity: item.categoryId
            ? {
                entityType: "category",
                entityId: item.categoryId,
                label: item.category,
              }
            : null,
          primaryAction: {
            label: "Переглянути огляд",
            actionType: "navigate",
            targetType: "tab",
            targetValue: "overview",
          },
          secondaryAction: null,
          context: {
            algorithm: "rule_based_financial_analytics",
            signalType: isOverLimit
              ? "budget_category_over_limit"
              : "budget_category_near_limit",
            period: "current_month",
            metrics: {
              category: item.category,
              limit: item.limit,
              spent: item.spent,
              usagePercent: item.usagePercent,
              remaining: item.remaining,
            },
            thresholds: {
              nearLimitWarning: 85,
              overLimitBoundary: 100,
            },
            confidence: "high",
          },
        })
      );
    });
  }

  if (
    overview30.net > 0 &&
    comparison30.previous.net >= 0 &&
    netTrend.percentChange >= 20
  ) {
    findings.push(
      buildFinding({
        type: "behavior_insight",
        priority: "low",
        title: "Фінансовий баланс покращився",
        message: `За останні 30 днів чистий баланс покращився на ${netTrend.percentChange}% порівняно з попереднім періодом. Поточна фінансова динаміка виглядає більш стабільною.`,
        facts: [
          `Поточне нетто: ${comparison30.current.net}`,
          `Попереднє нетто: ${comparison30.previous.net}`,
          `Покращення: +${netTrend.percentChange}%`,
        ],
        explanation:
          "Позитивний інсайт формується тоді, коли система бачить відчутне покращення чистого балансу без ознак дефіциту.",
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: null,
        context: {
          algorithm: "rule_based_financial_analytics",
          signalType: "positive_balance_trend",
          period: "30d_vs_prev_30d",
          metrics: {
            currentNet: comparison30.current.net,
            previousNet: comparison30.previous.net,
            percentChange: netTrend.percentChange,
            absoluteChange: netTrend.absoluteChange,
          },
          thresholds: {
            positiveTrendBoundary: 20,
          },
          confidence: dataSufficiency.level,
        },
      })
    );
  }

  const prioritizedFindings = findings.sort((a, b) => {
    const weight = { high: 3, medium: 2, low: 1 };
    return weight[b.priority] - weight[a.priority];
  });

  return {
    metrics: {
      overviewByPeriod: {
        "7d": overview7,
        "30d": overview30,
        "90d": overview90,
      },
      comparison30,
      budgetAnalysis,
      dataSufficiency,
    },
    signals,
    findings: prioritizedFindings,
  };
};

module.exports = {
  analyzeRuleBasedFinancials,
};