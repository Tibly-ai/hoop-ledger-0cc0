import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
const STORAGE_KEY = "hoopLedgerBets";
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function formatOdds(odds) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}
function computeProfit(bet) {
  if (bet.result === "Win") {
    return bet.odds > 0 ? bet.stake * (bet.odds / 100) : bet.stake * (100 / Math.abs(bet.odds));
  }
  if (bet.result === "Loss") return -bet.stake;
  return 0;
}
function loadBets() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Saved data is not a list of bets.");
  return parsed;
}
function saveBets(bets) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
}
const emptyForm = {
  date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
  team: "",
  opponent: "",
  betType: "Spread",
  pick: "",
  odds: "-110",
  stake: "1",
  notes: ""
};
function App() {
  const [bets, setBets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setBets(loadBets());
        setLoadError("");
      } catch (err) {
        setLoadError("We couldn't read your saved bets. The saved file looks corrupted.");
      } finally {
        setIsLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, []);
  function persist(next) {
    setBets(next);
    try {
      saveBets(next);
    } catch (err) {
      setLoadError("Your bet was recorded on this screen but couldn't be saved to this browser.");
    }
  }
  function resetStorage() {
    window.localStorage.removeItem(STORAGE_KEY);
    setBets([]);
    setLoadError("");
  }
  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const oddsNum = Number(form.odds);
    const stakeNum = Number(form.stake);
    if (!form.team.trim() || !form.opponent.trim() || !form.pick.trim()) {
      setFormError("Fill in the team, opponent, and your pick before saving.");
      return;
    }
    if (!Number.isFinite(oddsNum) || oddsNum === 0) {
      setFormError("Odds need to be a number like -110 or +150.");
      return;
    }
    if (!Number.isFinite(stakeNum) || stakeNum <= 0) {
      setFormError("Stake needs to be a positive number of units.");
      return;
    }
    const newBet = {
      id: makeId(),
      date: form.date,
      team: form.team.trim(),
      opponent: form.opponent.trim(),
      betType: form.betType,
      pick: form.pick.trim(),
      odds: oddsNum,
      stake: stakeNum,
      result: "Pending",
      notes: form.notes.trim()
    };
    persist([newBet, ...bets]);
    setForm({ ...emptyForm, date: form.date });
  }
  function updateResult(id, result) {
    persist(bets.map((b) => b.id === id ? { ...b, result } : b));
  }
  function removeBet(id) {
    persist(bets.filter((b) => b.id !== id));
  }
  const stats = useMemo(() => {
    const wins = bets.filter((b) => b.result === "Win").length;
    const losses = bets.filter((b) => b.result === "Loss").length;
    const pushes = bets.filter((b) => b.result === "Push").length;
    const pending = bets.filter((b) => b.result === "Pending").length;
    const settledStakeBets = bets.filter((b) => b.result === "Win" || b.result === "Loss");
    const totalStaked = settledStakeBets.reduce((s, b) => s + b.stake, 0);
    const netUnits = bets.reduce((s, b) => s + computeProfit(b), 0);
    const roi = totalStaked > 0 ? netUnits / totalStaked * 100 : 0;
    return { wins, losses, pushes, pending, netUnits, roi, total: bets.length };
  }, [bets]);
  const filteredBets = useMemo(() => {
    return bets.filter((b) => {
      const matchesTeam = teamFilter.trim() === "" || b.team.toLowerCase().includes(teamFilter.trim().toLowerCase()) || b.opponent.toLowerCase().includes(teamFilter.trim().toLowerCase());
      const matchesType = typeFilter === "All" || b.betType === typeFilter;
      return matchesTeam && matchesType;
    }).sort((a, b) => a.date < b.date ? 1 : -1);
  }, [bets, teamFilter, typeFilter]);
  function resultBadgeClass(result) {
    if (result === "Win") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800";
    if (result === "Loss") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800";
    if (result === "Push") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700";
    return "px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800";
  }
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-surface text-ink px-4 py-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("header", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl font-bold text-ink", children: "Hoop Ledger Dashboard" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted mt-1", children: "Log every college basketball wager and keep a real record of your season, not just a gut feeling." })
    ] }),
    loadError && /* @__PURE__ */ jsxs("div", { className: "card p-4 mb-6 border border-red-300 bg-red-50 text-red-800 flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsx("span", { children: loadError }),
      /* @__PURE__ */ jsx("button", { className: "btn-secondary", onClick: resetStorage, children: "Reset saved data" })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "card p-10 text-center text-muted", children: "Loading your ledger..." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("section", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "card p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted", children: "Record" }),
          /* @__PURE__ */ jsxs("p", { className: "text-2xl font-bold text-ink", children: [
            stats.wins,
            "-",
            stats.losses,
            "-",
            stats.pushes
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted mt-1", children: [
            stats.pending,
            " pending"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted", children: "Net Units" }),
          /* @__PURE__ */ jsxs("p", { className: stats.netUnits >= 0 ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-red-700", children: [
            stats.netUnits >= 0 ? "+" : "",
            stats.netUnits.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted", children: "ROI" }),
          /* @__PURE__ */ jsxs("p", { className: stats.roi >= 0 ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-red-700", children: [
            stats.roi >= 0 ? "+" : "",
            stats.roi.toFixed(1),
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "card p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted", children: "Bets Logged" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-ink", children: stats.total })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "card p-5 mb-8", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-semibold mb-4 text-ink", children: "Log a new bet" }),
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Date" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "date",
                value: form.date,
                onChange: (e) => setForm({ ...form, date: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Team you're backing" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "Duke",
                value: form.team,
                onChange: (e) => setForm({ ...form, team: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Opponent" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "UNC",
                value: form.opponent,
                onChange: (e) => setForm({ ...form, opponent: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Bet type" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: form.betType,
                onChange: (e) => setForm({ ...form, betType: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "Spread", children: "Spread" }),
                  /* @__PURE__ */ jsx("option", { value: "Moneyline", children: "Moneyline" }),
                  /* @__PURE__ */ jsx("option", { value: "Total", children: "Total" }),
                  /* @__PURE__ */ jsx("option", { value: "Player Prop", children: "Player Prop" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Your pick" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "Duke -4.5",
                value: form.pick,
                onChange: (e) => setForm({ ...form, pick: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Odds" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "-110",
                value: form.odds,
                onChange: (e) => setForm({ ...form, odds: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Stake (units)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "1",
                value: form.stake,
                onChange: (e) => setForm({ ...form, stake: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted mb-1", children: "Notes (optional)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "Line moved late, took it anyway",
                value: form.notes,
                onChange: (e) => setForm({ ...form, notes: e.target.value }),
                className: "w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-3 flex items-center gap-4", children: [
            /* @__PURE__ */ jsx("button", { type: "submit", className: "btn", children: "Save bet" }),
            formError && /* @__PURE__ */ jsx("span", { className: "text-sm text-red-700", children: formError })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "card p-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-semibold text-ink", children: "Past wagers" }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "Filter by team...",
                value: teamFilter,
                onChange: (e) => setTeamFilter(e.target.value),
                className: "rounded-md border border-line px-3 py-2 bg-white text-ink text-sm"
              }
            ),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: typeFilter,
                onChange: (e) => setTypeFilter(e.target.value),
                className: "rounded-md border border-line px-3 py-2 bg-white text-ink text-sm",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "All", children: "All bet types" }),
                  /* @__PURE__ */ jsx("option", { value: "Spread", children: "Spread" }),
                  /* @__PURE__ */ jsx("option", { value: "Moneyline", children: "Moneyline" }),
                  /* @__PURE__ */ jsx("option", { value: "Total", children: "Total" }),
                  /* @__PURE__ */ jsx("option", { value: "Player Prop", children: "Player Prop" })
                ]
              }
            )
          ] })
        ] }),
        bets.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-10 text-muted", children: [
          /* @__PURE__ */ jsx("p", { className: "mb-2", children: "No bets logged yet." }),
          /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Use the form above to log your first game and start building your record." })
        ] }) : filteredBets.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-center py-10 text-muted", children: "No bets match that filter. Try clearing the team search or bet type." }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: filteredBets.map((bet) => {
          const profit = computeProfit(bet);
          return /* @__PURE__ */ jsxs("div", { className: "border border-line rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("p", { className: "font-semibold text-ink", children: [
                bet.team,
                " vs ",
                bet.opponent,
                /* @__PURE__ */ jsxs("span", { className: "text-muted font-normal", children: [
                  " \xB7 ",
                  bet.date
                ] })
              ] }),
              /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted", children: [
                bet.betType,
                " \xB7 ",
                bet.pick,
                " \xB7 ",
                formatOdds(bet.odds),
                " \xB7 ",
                bet.stake,
                "u"
              ] }),
              bet.notes && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted mt-1", children: bet.notes })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx("span", { className: resultBadgeClass(bet.result), children: bet.result }),
              bet.result !== "Pending" && /* @__PURE__ */ jsxs("span", { className: profit >= 0 ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-700", children: [
                profit >= 0 ? "+" : "",
                profit.toFixed(2),
                "u"
              ] }),
              bet.result === "Pending" && /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsx("button", { className: "btn-secondary text-xs px-2 py-1", onClick: () => updateResult(bet.id, "Win"), children: "Win" }),
                /* @__PURE__ */ jsx("button", { className: "btn-secondary text-xs px-2 py-1", onClick: () => updateResult(bet.id, "Loss"), children: "Loss" }),
                /* @__PURE__ */ jsx("button", { className: "btn-secondary text-xs px-2 py-1", onClick: () => updateResult(bet.id, "Push"), children: "Push" })
              ] }),
              /* @__PURE__ */ jsx("button", { className: "text-xs text-red-700 underline", onClick: () => removeBet(bet.id), children: "Remove" })
            ] })
          ] }, bet.id);
        }) })
      ] })
    ] })
  ] }) });
}
createRoot(document.getElementById("tibly-app-root")).render(/* @__PURE__ */ jsx(App, {}));
