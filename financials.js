// ============================================================
// JPE WRESTLING GM — financials.js (Phase 1 modular extraction)
// ------------------------------------------------------------
// All financial logic lives here: the JPEFinancialEconomy class,
// brand money helpers, daily income + brand income split, merch
// interest/revenue/forecast, the spending framework, and the merch
// state mutators.
//
// This is a classic (non-module) script loaded BEFORE the main inline
// script in index.html, so every declaration shares the global scope.
// Functions/classes reference globals like `game`, `getWrestler`,
// `saveGame`, `updateMerchMeter`, `currentTab`, `refreshMerchFocus`
// (still defined in index.html) only at call time, by which point the
// inline script has run. Logic is moved verbatim — no behavior changes.
// Globals are re-exported on `window.*` at the bottom for clarity.
// ============================================================

// ==================== v83 PATCH: Notes 11/12 - JPEFinancialEconomy Class (careful integration from pt11/pt12) ====================
// Educational wisdom from university/college resources (e.g., SJSU game dev PDFs, USC HTML5 courses, DMU Foundation Game Design):
// - Classes for encapsulation/separation of concerns in vanilla single-file JS games (better maintainability, no bloat).
// - Data-driven history (arrays of objects) for belts/UI without mutating core logic.
// - Idle income, training spend as pure methods. No dups with existing (addBrandMoney, collectMerchRevenue, trainStat, levelUpEquipment, simulateShow, etc. remain untouched).
// - Optional sync: class mirrors game state for future; current systems unchanged. Added only new non-overlapping methods.

class JPEFinancialEconomy {
  constructor() {
    this.money = 125000;
    this.popularity = 65;
    this.merch_budget = 40;
    this.merch_focus_count = 0;
    this.merch_modifier = 1.0;
    this.active_jokers = new Set();
    this.training_points = 0;
    this.cold_streak = 0;
    this.last_show_rating = 50;
    this.day = 1;
  }
  set_merch_budget(p) { this.merch_budget = Math.max(10, Math.min(90, parseInt(p))); }
  set_merch_focus(c) { this.merch_focus_count = Math.max(0, Math.min(3, parseInt(c))); }
  add_joker(n) { this.active_jokers.add(n.toLowerCase()); }
  remove_joker(n) { this.active_jokers.delete(n.toLowerCase()); }
  calculate_daily_income() {
    const base = this.popularity * 95;
    const merch = base * (this.merch_budget / 100);
    const focus = this.merch_focus_count * 600;
    const subtotal = base + merch + focus;
    let mod = this.merch_modifier;
    if (this.cold_streak >= 2) mod *= Math.pow(0.90, this.cold_streak - 1);
    let total = subtotal * mod;
    if (this.active_jokers.has("merchandise_machine")) total *= 1.3;
    return { base: Math.round(base), merch_bonus: Math.round(merch), focus_bonus: Math.round(focus), total: Math.round(total) };
  }
  add_daily_income() {
    const b = this.calculate_daily_income();
    this.money += b.total;
    const tp = Math.floor(b.total / 380);
    this.training_points += tp;
    b.tp = tp;
    return b;
  }
  process_show(r) {
    r = Math.max(0, Math.min(100, parseInt(r)));
    this.last_show_rating = r;
    const bonus = Math.round(r * 2.1);
    this.money += bonus;
    let tp = Math.floor(r * 0.85);
    if (r >= 80) tp += 25; else if (r >= 70) tp += 10;
    this.training_points += tp;
    if (r < 60) { this.cold_streak++; this.merch_modifier = 0.65; }
    else { this.cold_streak = 0; this.merch_modifier = 1.0; }
    return { show_bonus: bonus, tp_from_show: tp, cold_streak: this.cold_streak };
  }
  calculate_idle_income(s = 7) {
    let i = (this.popularity * 2.8 / 7) * s;
    if (this.active_jokers.has("merchandise_machine")) i *= 1.3;
    return parseFloat(i.toFixed(2));
  }
  add_idle_income(s = 7) { const i = this.calculate_idle_income(s); this.money += i; return i; }
  spend_training_points(a) { if (this.training_points >= a) { this.training_points -= a; return true; } return false; }
  get_financial_summary() {
    return { money: Math.round(this.money), popularity: this.popularity, merch_budget: this.merch_budget,
      merch_focus_count: this.merch_focus_count, training_points: this.training_points,
      cold_streak: this.cold_streak, active_jokers: Array.from(this.active_jokers) };
  }
}

// Optional instance (non-breaking wrapper; core continues using direct game props)
let financialEconomy = new JPEFinancialEconomy();

// === v44 BRAND MONEY HELPERS (Foundation) ===
function getBrandKey(brand) {
    if (!brand) return null;
    const b = brand.toLowerCase().replace(/\s/g, "");
    if (b === "meltdown") return "meltdown";
    if (b === "grandslam") return "grandSlam";
    if (b === "gamma") return "gamma";
    return null;
}

function addBrandMoney(brand, amount) {
    const key = getBrandKey(brand);
    if (!key || !game.brandMoney) return false;
    if (typeof game.brandMoney[key] !== "number") {
        game.brandMoney[key] = 0;
    }
    game.brandMoney[key] += Math.max(0, Math.floor(amount));
    return true;
}

function getBrandMoney(brand) {
    const key = getBrandKey(brand);
    return key && game.brandMoney ? (game.brandMoney[key] || 0) : 0;
}

// ===== v38 ECONOMY (CORE FIX) =====
function getDailyIncome() {
    let base = Math.floor(game.popularity * 95);
    let merchB = Math.floor(base * (game.merchBudget / 100));
    let focusB = game.merchFocus.length * 600;
    let rivB = 0;
    Object.keys(game.rivalries || {}).forEach(k => {
        const r = game.rivalries[k] || 0;
        if (r > 35) rivB += Math.floor(r * 1.6);
    });

    let effectiveMod = game.merchModifier || 1;
    if ((game.cold_streak || 0) >= 2) {
        const streakPen = Math.pow(0.9, (game.cold_streak || 0) - 1);
        effectiveMod *= streakPen;
    }

    let subtotal = base + merchB + focusB + rivB;
    let total = Math.floor(subtotal * effectiveMod);

    if (game.unlockedJokers && game.unlockedJokers.includes("MerchandiseMachine")) {
        total = Math.floor(total * 1.3);
    }

    // === Split income between brands ===
    const brandShares = calculateBrandIncome(total);

    return {
        total,
        brandShares,
        breakdown: {
            base,
            merchBonus: merchB,
            focusBonus: focusB,
            rivMerch: rivB,
            effectiveModifier: parseFloat(effectiveMod.toFixed(2))
        },
        coldStreakPenalty: (game.cold_streak || 0) >= 2
    };
}

// ==================== BRAND INCOME SPLIT ====================
function calculateBrandIncome(totalIncome) {
    const day = game.date.day;
    let meltdownShare = 0;
    let grandSlamShare = 0;
    let gammaShare = 0;

    if (day % 7 === 1) {
        meltdownShare = totalIncome;
    } else if (day % 7 === 3) {
        grandSlamShare = totalIncome;
    } else if (day % 7 === 5) {
        gammaShare = totalIncome;
    } else {
        const meltdownPop = game.wrestlers
            .filter(w => w.brand === "Meltdown")
            .reduce((sum, w) => sum + (w.popularity || 60), 0);
        const grandSlamPop = game.wrestlers
            .filter(w => w.brand === "GrandSlam")
            .reduce((sum, w) => sum + (w.popularity || 60), 0);
        const gammaPop = game.wrestlers
            .filter(w => w.brand === "Gamma")
            .reduce((sum, w) => sum + (w.popularity || 60), 0);
        const totalPop = meltdownPop + grandSlamPop + gammaPop || 1;
        meltdownShare = Math.floor(totalIncome * (meltdownPop / totalPop));
        grandSlamShare = Math.floor(totalIncome * (grandSlamPop / totalPop));
        gammaShare = totalIncome - meltdownShare - grandSlamShare;
    }

    return { meltdown: meltdownShare, grandSlam: grandSlamShare, gamma: gammaShare };
}

// ==================== v83 PATCH: MERCH INTEREST SYSTEM from pt9 note ====================
// Accrue interest on uncollected merch for long-term economy depth (vibe: risky to leave uncollected)
function accrueMerchInterest() {
  if (!game.uncollectedMerch) game.uncollectedMerch = 0;
  if (game.uncollectedMerch > 0) {
    const weeksUncollected = Math.max(1, (game.date.day || 0) - (game.lastMerchCollectionDay || 0));
    let interestRate = 0.045;
    if (weeksUncollected > 3) interestRate = 0.025;
    if (weeksUncollected > 6) interestRate = 0.012;
    const interest = Math.floor(game.uncollectedMerch * interestRate * weeksUncollected);
    game.uncollectedMerch += interest;
    return { added: interest, total: game.uncollectedMerch, weeks: weeksUncollected };
  }
  return { added: 0, total: 0 };
}

function collectMerchRevenue() {
  accrueMerchInterest();
  const freshMerch = (typeof calculateMerchRevenue === 'function') ? calculateMerchRevenue() : Math.floor(game.popularity * 380);
  const totalToCollect = freshMerch + (game.uncollectedMerch || 0);
  game.money += totalToCollect;
  game.uncollectedMerch = 0;
  game.lastMerchCollectionDay = game.date.day || 0;
  if (typeof updateMerchMeter === 'function') updateMerchMeter();
  saveGame();
  return {
    fresh: freshMerch,
    interestCollected: totalToCollect - freshMerch,
    total: totalToCollect
  };
}

function getUncollectedMerchTotal() {
  if (!game.uncollectedMerch || game.uncollectedMerch <= 0) return 0;
  const weeks = Math.max(1, (game.date.day || 0) - (game.lastMerchCollectionDay || 0));
  let projected = game.uncollectedMerch;
  let rate = 0.045;
  if (weeks > 3) rate = 0.025;
  if (weeks > 6) rate = 0.012;
  projected += Math.floor(game.uncollectedMerch * rate * weeks);
  return projected;
}

function forecastNextDayIncome() {
    let base = Math.floor(game.popularity * 95);
    let merchB = Math.floor(base * (game.merchBudget / 100));
    let focusB = game.merchFocus.length * 600;
    let rivB = 0;
    Object.keys(game.rivalries || {}).forEach(k => {
        const r = game.rivalries[k] || 0;
        if (r > 35) rivB += Math.floor(r * 1.6);
    });

    let effectiveMod = game.merchModifier || 1;
    if ((game.cold_streak || 0) >= 2) {
        effectiveMod *= Math.pow(0.9, game.cold_streak - 1);
    }

    let subtotal = base + merchB + focusB + rivB;
    let total = Math.floor(subtotal * effectiveMod);

    if (game.unlockedJokers && game.unlockedJokers.includes("MerchandiseMachine")) {
        total = Math.floor(total * 1.3);
    }

    let tomorrow = { ...game.date };
    tomorrow.day++;
    if (tomorrow.day > 30) { tomorrow.day = 1; tomorrow.month++; if (tomorrow.month > 12) { tomorrow.month = 1; tomorrow.year++; } }

    const isPPV = (tomorrow.day % 7 === 0);
    let ppvBonus = 1;
    let ppvLabel = "";
    if (isPPV) {
        ppvBonus = 1.22;
        ppvLabel = "PPV WINDOW BONUS";
        total = Math.floor(total * ppvBonus);
    }

    return {
        total: Math.floor(total),
        isPPV,
        ppvLabel,
        effectiveModifier: parseFloat(effectiveMod.toFixed(2)),
        breakdown: { base, merchBonus: merchB, focusBonus: focusB, rivMerch: rivB },
        note: isPPV ? "High revenue day expected — merch & tickets spike!" : "Regular day"
    };
}

// ==================== SPENDING FRAMEWORK ====================
function canBrandAfford(brand, amount) {
    const key = brand.toLowerCase().replace(" ", "");
    if (!game.brandMoney || game.brandMoney[key] == null) return false;
    return game.brandMoney[key] >= amount;
}

function spendBrandMoney(brand, amount, reason = "Unknown") {
    const key = brand.toLowerCase().replace(" ", "");
    if (!game.brandMoney || game.brandMoney[key] == null) return false;
    if (game.brandMoney[key] < amount) {
        alert(`${brand} does not have enough money! (Needs $${amount.toLocaleString()})`);
        return false;
    }
    game.brandMoney[key] -= amount;
    if (!game.brandTransactions) game.brandTransactions = [];
    game.brandTransactions.push({ day: game.date.day, brand, amount, reason });
    return true;
}

// ---- Merch state mutators (rendering helpers stay in index.html / ui.js) ----
// Slider updates only the readout — no tab rebuild on every drag tick.
function updateMerchBudget(val) {
    game.merchBudget = parseInt(val);
    const out = el('merchBudgetVal');
    if (out) out.textContent = game.merchBudget + '%';
    saveGame();
}

function addMerchFocus(name) {
    const wrestler = getWrestler(name);
    if (!wrestler) return;
    const cost = 2500;
    if (!spendBrandMoney(wrestler.brand, cost, `Merch push for ${name}`)) return;
    if (game.merchFocus.length < 3 && !game.merchFocus.includes(name)) {
        game.merchFocus.push(name);
    }
    updateMerchMeter();
    saveGame();
    if (currentTab === 3) refreshMerchFocus();
}

function removeMerchFocus(i) {
    game.merchFocus.splice(i,1);
    updateMerchMeter();
    saveGame();
    if (currentTab === 3) refreshMerchFocus();
}

// ============================================================
// GLOBAL EXPORTS — make this module's classes/instances/functions
// available across the other classic scripts (and the dev console).
// Function declarations are already global; the class and the
// `financialEconomy` instance are not, so these assignments matter.
// ============================================================
window.JPEFinancialEconomy = JPEFinancialEconomy;
window.financialEconomy = financialEconomy;
window.getBrandKey = getBrandKey;
window.addBrandMoney = addBrandMoney;
window.getBrandMoney = getBrandMoney;
window.getDailyIncome = getDailyIncome;
window.calculateBrandIncome = calculateBrandIncome;
window.accrueMerchInterest = accrueMerchInterest;
window.collectMerchRevenue = collectMerchRevenue;
window.getUncollectedMerchTotal = getUncollectedMerchTotal;
window.forecastNextDayIncome = forecastNextDayIncome;
window.canBrandAfford = canBrandAfford;
window.spendBrandMoney = spendBrandMoney;
window.updateMerchBudget = updateMerchBudget;
window.addMerchFocus = addMerchFocus;
window.removeMerchFocus = removeMerchFocus;
