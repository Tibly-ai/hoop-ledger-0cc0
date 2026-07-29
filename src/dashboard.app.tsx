import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

type BetType = "Spread" | "Moneyline" | "Total" | "Player Prop";
type Result = "Pending" | "Win" | "Loss" | "Push";

interface Bet {
  id: string;
  date: string;
  team: string;
  opponent: string;
  betType: BetType;
  pick: string;
  odds: number;
  stake: number;
  result: Result;
  notes: string;
}

const STORAGE_KEY = "hoopLedgerBets";

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function computeProfit(bet: Bet): number {
  if (bet.result === "Win") {
    return bet.odds > 0 ? bet.stake * (bet.odds / 100) : bet.stake * (100 / Math.abs(bet.odds));
  }
  if (bet.result === "Loss") return -bet.stake;
  return 0;
}

function loadBets(): Bet[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Saved data is not a list of bets.");
  return parsed as Bet[];
}

function saveBets(bets: Bet[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
}

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  team: "",
  opponent: "",
  betType: "Spread" as BetType,
  pick: "",
  odds: "-110",
  stake: "1",
  notes: "",
};

function App() {
  const [bets, setBets] = useState<Bet[]>([]);
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

  function persist(next: Bet[]) {
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

  function handleSubmit(e: React.FormEvent) {
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

    const newBet: Bet = {
      id: makeId(),
      date: form.date,
      team: form.team.trim(),
      opponent: form.opponent.trim(),
      betType: form.betType,
      pick: form.pick.trim(),
      odds: oddsNum,
      stake: stakeNum,
      result: "Pending",
      notes: form.notes.trim(),
    };

    persist([newBet, ...bets]);
    setForm({ ...emptyForm, date: form.date });
  }

  function updateResult(id: string, result: Result) {
    persist(bets.map((b) => (b.id === id ? { ...b, result } : b)));
  }

  function removeBet(id: string) {
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
    const roi = totalStaked > 0 ? (netUnits / totalStaked) * 100 : 0;
    return { wins, losses, pushes, pending, netUnits, roi, total: bets.length };
  }, [bets]);

  const filteredBets = useMemo(() => {
    return bets
      .filter((b) => {
        const matchesTeam =
          teamFilter.trim() === "" ||
          b.team.toLowerCase().includes(teamFilter.trim().toLowerCase()) ||
          b.opponent.toLowerCase().includes(teamFilter.trim().toLowerCase());
        const matchesType = typeFilter === "All" || b.betType === typeFilter;
        return matchesTeam && matchesType;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [bets, teamFilter, typeFilter]);

  function resultBadgeClass(result: Result): string {
    if (result === "Win") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800";
    if (result === "Loss") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800";
    if (result === "Push") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700";
    return "px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800";
  }

  return (
    <div className="min-h-screen bg-surface text-ink px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink">Hoop Ledger Dashboard</h1>
          <p className="text-muted mt-1">
            Log every college basketball wager and keep a real record of your season, not just a gut feeling.
          </p>
        </header>

        {loadError && (
          <div className="card p-4 mb-6 border border-red-300 bg-red-50 text-red-800 flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button className="btn-secondary" onClick={resetStorage}>
              Reset saved data
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="card p-10 text-center text-muted">Loading your ledger...</div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-4">
                <p className="text-sm text-muted">Record</p>
                <p className="text-2xl font-bold text-ink">
                  {stats.wins}-{stats.losses}-{stats.pushes}
                </p>
                <p className="text-xs text-muted mt-1">{stats.pending} pending</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-muted">Net Units</p>
                <p className={stats.netUnits >= 0 ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-red-700"}>
                  {stats.netUnits >= 0 ? "+" : ""}
                  {stats.netUnits.toFixed(2)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-muted">ROI</p>
                <p className={stats.roi >= 0 ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-red-700"}>
                  {stats.roi >= 0 ? "+" : ""}
                  {stats.roi.toFixed(1)}%
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-muted">Bets Logged</p>
                <p className="text-2xl font-bold text-ink">{stats.total}</p>
              </div>
            </section>

            <section className="card p-5 mb-8">
              <h2 className="font-display text-xl font-semibold mb-4 text-ink">Log a new bet</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Team you're backing</label>
                  <input
                    type="text"
                    placeholder="Duke"
                    value={form.team}
                    onChange={(e) => setForm({ ...form, team: e.target.value })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Opponent</label>
                  <input
                    type="text"
                    placeholder="UNC"
                    value={form.opponent}
                    onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Bet type</label>
                  <select
                    value={form.betType}
                    onChange={(e) => setForm({ ...form, betType: e.target.value as BetType })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  >
                    <option value="Spread">Spread</option>
                    <option value="Moneyline">Moneyline</option>
                    <option value="Total">Total</option>
                    <option value="Player Prop">Player Prop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Your pick</label>
                  <input
                    type="text"
                    placeholder="Duke -4.5"
                    value={form.pick}
                    onChange={(e) => setForm({ ...form, pick: e.target.value })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Odds</label>
                  <input
                    type="text"
                    placeholder="-110"
                    value={form.odds}
                    onChange={(e) => setForm({ ...form, odds: e.target.value })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Stake (units)</label>
                  <input
                    type="text"
                    placeholder="1"
                    value={form.stake}
                    onChange={(e) => setForm({ ...form, stake: e.target.value })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-muted mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    placeholder="Line moved late, took it anyway"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-md border border-line px-3 py-2 bg-white text-ink"
                  />
                </div>
                <div className="md:col-span-3 flex items-center gap-4">
                  <button type="submit" className="btn">
                    Save bet
                  </button>
                  {formError && <span className="text-sm text-red-700">{formError}</span>}
                </div>
              </form>
            </section>

            <section className="card p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h2 className="font-display text-xl font-semibold text-ink">Past wagers</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Filter by team..."
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="rounded-md border border-line px-3 py-2 bg-white text-ink text-sm"
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-md border border-line px-3 py-2 bg-white text-ink text-sm"
                  >
                    <option value="All">All bet types</option>
                    <option value="Spread">Spread</option>
                    <option value="Moneyline">Moneyline</option>
                    <option value="Total">Total</option>
                    <option value="Player Prop">Player Prop</option>
                  </select>
                </div>
              </div>

              {bets.length === 0 ? (
                <div className="text-center py-10 text-muted">
                  <p className="mb-2">No bets logged yet.</p>
                  <p className="text-sm">Use the form above to log your first game and start building your record.</p>
                </div>
              ) : filteredBets.length === 0 ? (
                <div className="text-center py-10 text-muted">
                  No bets match that filter. Try clearing the team search or bet type.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBets.map((bet) => {
                    const profit = computeProfit(bet);
                    return (
                      <div key={bet.id} className="border border-line rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">
                            {bet.team} vs {bet.opponent}
                            <span className="text-muted font-normal"> · {bet.date}</span>
                          </p>
                          <p className="text-sm text-muted">
                            {bet.betType} · {bet.pick} · {formatOdds(bet.odds)} · {bet.stake}u
                          </p>
                          {bet.notes && <p className="text-xs text-muted mt-1">{bet.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={resultBadgeClass(bet.result)}>{bet.result}</span>
                          {bet.result !== "Pending" && (
                            <span className={profit >= 0 ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-700"}>
                              {profit >= 0 ? "+" : ""}
                              {profit.toFixed(2)}u
                            </span>
                          )}
                          {bet.result === "Pending" && (
                            <div className="flex gap-2">
                              <button className="btn-secondary text-xs px-2 py-1" onClick={() => updateResult(bet.id, "Win")}>
                                Win
                              </button>
                              <button className="btn-secondary text-xs px-2 py-1" onClick={() => updateResult(bet.id, "Loss")}>
                                Loss
                              </button>
                              <button className="btn-secondary text-xs px-2 py-1" onClick={() => updateResult(bet.id, "Push")}>
                                Push
                              </button>
                            </div>
                          )}
                          <button className="text-xs text-red-700 underline" onClick={() => removeBet(bet.id)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("tibly-app-root")!).render(<App />);