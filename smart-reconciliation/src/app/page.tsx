"use client";

import { useMemo, useState } from "react";
import { parseCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/format";
import { reconcileTransactions } from "@/lib/matching";
import { normalizeDataset } from "@/lib/normalization";
import { sampleLedgerCsv, sampleStatementCsv } from "@/lib/sampleData";
import type { EngineConfig, ReconciliationRun } from "@/lib/types";

const DEFAULT_CONFIG: EngineConfig = {
  dateToleranceDays: 3,
  descriptionThreshold: 0.8,
  amountTolerance: 0.01,
  aggregationAmountTolerance: 5,
  aggregationMaxGroupSize: 5,
};

export default function Home() {
  const [statementInput, setStatementInput] = useState(sampleStatementCsv);
  const [ledgerInput, setLedgerInput] = useState(sampleLedgerCsv);
  const [config, setConfig] = useState<EngineConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<ReconciliationRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!result) return null;
    const totalStatement = result.matched.length + result.aggregated.length + result.unmatchedStatements.length;
    const totalLedger = result.matched.length + result.aggregated.length + result.unmatchedLedger.length;
    return {
      totalStatement,
      totalLedger,
      matched: result.matched.length,
      aggregated: result.aggregated.length,
      unmatchedStatement: result.unmatchedStatements.length,
      unmatchedLedger: result.unmatchedLedger.length,
      coverage: totalLedger === 0 ? 0 : ((result.matched.length + result.aggregated.length) / totalLedger) * 100,
    };
  }, [result]);

  const viewModel = result && stats ? { result, stats } : null;

  function handleRun() {
    try {
      setError(null);
      const statementRows = parseCsv(statementInput, "statement");
      const ledgerRows = parseCsv(ledgerInput, "ledger");

      if (statementRows.length === 0 || ledgerRows.length === 0) {
        throw new Error("Please provide at least one row in both statement and ledger data.");
      }

      const statement = normalizeDataset(statementRows, "statement");
      const ledger = normalizeDataset(ledgerRows, "ledger");

      const reconciliation = reconcileTransactions(statement, ledger, config);
      setResult(reconciliation);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Unexpected error during reconciliation.");
    }
  }

  function handleReset() {
    setStatementInput(sampleStatementCsv);
    setLedgerInput(sampleLedgerCsv);
    setConfig(DEFAULT_CONFIG);
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10 space-y-4">
          <p className="text-sm font-semibold uppercase text-slate-500">Smart Reconciliation Engine</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Layered automation that thinks like a bookkeeper
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Prepare, normalize, and intelligently match bank statements against ledger entries. Combine deterministic
            rules with fuzzy matching and smart aggregation to pinpoint reconciliation differences in seconds.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Data Inputs</h2>
            <p className="text-sm text-slate-600">
              Paste CSV data with columns: <code className="rounded bg-slate-100 px-1 py-0.5">id</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">date</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">description</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">amount</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">type</code>.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="statement" className="mb-2 block text-sm font-medium text-slate-700">
                  Bank Statement
                </label>
                <textarea
                  id="statement"
                  value={statementInput}
                  onChange={(event) => setStatementInput(event.target.value)}
                  className="min-h-[10rem] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 shadow-inner focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label htmlFor="ledger" className="mb-2 block text-sm font-medium text-slate-700">
                  General Ledger
                </label>
                <textarea
                  id="ledger"
                  value={ledgerInput}
                  onChange={(event) => setLedgerInput(event.target.value)}
                  className="min-h-[10rem] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 shadow-inner focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRun}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                Run Reconciliation
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Reset &amp; Load Sample
              </button>
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Matching Rules</h2>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <label htmlFor="dateTolerance" className="font-medium text-slate-700">
                  Date tolerance (days)
                </label>
                <input
                  id="dateTolerance"
                  type="number"
                  min={0}
                  max={30}
                  value={config.dateToleranceDays}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      dateToleranceDays: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="descriptionThreshold" className="font-medium text-slate-700">
                  Description similarity (%)
                </label>
                <input
                  id="descriptionThreshold"
                  type="number"
                  min={10}
                  max={100}
                  value={Math.round(config.descriptionThreshold * 100)}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      descriptionThreshold: (Number.parseInt(event.target.value, 10) || 0) / 100,
                    }))
                  }
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="amountTolerance" className="font-medium text-slate-700">
                  Amount tolerance (R)
                </label>
                <input
                  id="amountTolerance"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={config.amountTolerance}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      amountTolerance: Number.parseFloat(event.target.value) || 0,
                    }))
                  }
                  className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="aggregationTolerance" className="font-medium text-slate-700">
                  Aggregation tolerance (R)
                </label>
                <input
                  id="aggregationTolerance"
                  type="number"
                  min={0}
                  max={1000}
                  step={0.5}
                  value={config.aggregationAmountTolerance}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      aggregationAmountTolerance: Number.parseFloat(event.target.value) || 0,
                    }))
                  }
                  className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="aggregationGroup" className="font-medium text-slate-700">
                  Aggregation group size
                </label>
                <input
                  id="aggregationGroup"
                  type="number"
                  min={2}
                  max={8}
                  value={config.aggregationMaxGroupSize}
                  onChange={(event) =>
                    setConfig((previous) => ({
                      ...previous,
                      aggregationMaxGroupSize: Number.parseInt(event.target.value, 10) || 2,
                    }))
                  }
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              The engine runs deterministic exact matches first, then fuzzy matches, and finally searches for
              aggregation opportunities within the configured tolerance window.
            </p>
          </div>
        </section>

        {viewModel ? (
          <section className="mt-10 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ledger Coverage</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{viewModel.stats.coverage.toFixed(0)}%</p>
                <p className="text-xs text-slate-500">Matches + aggregations over ledger population</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exact / Fuzzy matches</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{viewModel.stats.matched}</p>
                <p className="text-xs text-slate-500">One-to-one confirmations</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aggregations</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{viewModel.stats.aggregated}</p>
                <p className="text-xs text-slate-500">Grouped matches &amp; rolling totals</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unmatched</p>
                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {viewModel.stats.unmatchedLedger + viewModel.stats.unmatchedStatement}
                </p>
                <p className="text-xs text-slate-500">Requires review</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Confirmed Matches</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Deterministic and fuzzy matches that meet the configured thresholds.
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Statement</th>
                        <th className="px-4 py-3">Ledger</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewModel.result.matched.map((match) => (
                        <tr key={`${match.statement.id}-${match.ledger.id}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{match.statement.description}</p>
                            <p className="text-xs text-slate-500">
                              {match.statement.normalizedDate} · {match.statement.category}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{match.ledger.description}</p>
                            <p className="text-xs text-slate-500">
                              {match.ledger.normalizedDate} · {match.ledger.category}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(match.statement.amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-xs uppercase text-slate-500">
                            {(match.score * 100).toFixed(0)}%
                            <span className="block text-[10px] font-medium text-slate-400">{match.type}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {viewModel.result.matched.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">No direct matches yet.</div>
                  ) : null}
                </div>
                {viewModel.result.matched.length > 0 ? (
                  <details className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700">Explainability log</summary>
                    <ul className="mt-2 space-y-2 text-xs text-slate-600">
                      {viewModel.result.matched.map((match) => (
                        <li
                          key={`reason-${match.statement.id}-${match.ledger.id}`}
                          className="border-t border-slate-200 pt-2 first:border-none first:pt-0"
                        >
                          <p className="font-semibold text-slate-700">
                            {match.statement.description} ⇄ {match.ledger.description}
                          </p>
                          <ul className="mt-1 list-disc pl-5">
                            {match.reasons.map((reason, index) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-emerald-900">Smart Aggregations</h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Statement bundles that roll up to a single ledger entry within the tolerance window.
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-emerald-900">
                    {viewModel.result.aggregated.map((agg) => (
                      <li
                        key={agg.ledger.id}
                        className="rounded-xl border border-emerald-200 bg-white/80 px-4 py-3 shadow-sm"
                      >
                        <p className="font-semibold">
                          Ledger: {agg.ledger.description} ({formatCurrency(agg.ledger.amount)})
                        </p>
                        <p className="mt-1 text-xs text-emerald-700">
                          Statements: {agg.statements.map((tx) => tx.description).join("; ")}
                        </p>
                        <p className="text-xs text-emerald-700">
                          Combined{" "}
                          {formatCurrency(agg.ledger.sign === "debit" ? -agg.total : agg.total)} · Difference{" "}
                          {formatCurrency(agg.difference)}
                        </p>
                        <ul className="mt-2 list-disc pl-5 text-xs text-emerald-800">
                          {agg.reasons.map((reason, index) => (
                            <li key={index}>{reason}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                    {viewModel.result.aggregated.length === 0 ? (
                    <p className="rounded-lg bg-emerald-100/60 px-4 py-3 text-sm text-emerald-800">
                      No aggregation opportunities detected.
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-amber-900">Remaining Exceptions</h3>
                  <div className="mt-4 space-y-4 text-sm text-amber-800">
                    <div>
                      <p className="font-semibold">Unmatched Statements</p>
                      <ul className="mt-2 space-y-2">
                        {viewModel.result.unmatchedStatements.map((tx) => (
                          <li key={tx.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="font-medium text-amber-900">{tx.description}</p>
                            <p className="text-xs text-amber-700">
                              {tx.normalizedDate} · {tx.category} · {formatCurrency(tx.amount)}
                            </p>
                          </li>
                        ))}
                      </ul>
                      {viewModel.result.unmatchedStatements.length === 0 ? (
                        <p className="mt-2 rounded-md bg-amber-50/60 px-3 py-2 text-xs text-amber-700">
                          Statement side looks tidy.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold">Unmatched Ledger Entries</p>
                      <ul className="mt-2 space-y-2">
                        {viewModel.result.unmatchedLedger.map((tx) => (
                          <li key={tx.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="font-medium text-amber-900">{tx.description}</p>
                            <p className="text-xs text-amber-700">
                              {tx.normalizedDate} · {tx.category} · {formatCurrency(tx.amount)}
                            </p>
                          </li>
                        ))}
                      </ul>
                      {viewModel.result.unmatchedLedger.length === 0 ? (
                        <p className="mt-2 rounded-md bg-amber-50/60 px-3 py-2 text-xs text-amber-700">
                          Ledger side fully reconciled.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Run the engine to see suggested matches, aggregations, and exceptions.
          </section>
        )}
      </main>
    </div>
  );
}
