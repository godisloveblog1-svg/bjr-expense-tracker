import React, { useCallback, useEffect, useState } from "react"
import {
  History,
  PlusCircle,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CloudOff,
  Cloud
} from "lucide-react"
import { fetchAuditLog, fetchDeletedRows, restoreRow, TABLE_LABELS } from "@/lib/auditService"
import { isGoogleBackupConfigured } from "@/lib/googleBackupService"
import { formatINR } from "@/lib/utils"

const ACTION_META = {
  insert: { label: "Added", icon: PlusCircle, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  update: { label: "Edited", icon: Pencil, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  soft_delete: { label: "Deleted", icon: Trash2, badge: "bg-red-50 text-red-700 border-red-200" },
  restore: { label: "Restored", icon: RotateCcw, badge: "bg-blue-50 text-blue-700 border-blue-200" },
  delete: { label: "Removed permanently", icon: Trash2, badge: "bg-red-50 text-red-700 border-red-200" }
}

function formatWhen(value) {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })
}

function describeRow(row) {
  if (!row) return { title: "—", amount: null }
  const title = row.description || row.note || row.category || "(no description)"
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount)
  return { title, amount: Number.isFinite(amount) ? amount : null }
}

function entrySummary(entry) {
  const before = describeRow(entry.before_row)
  const after = describeRow(entry.after_row)
  const current = entry.action === "delete" || entry.action === "soft_delete" ? before : after

  // Show a before → after amount when an edit changed the money
  if (
    entry.action === "update" &&
    before.amount !== null &&
    after.amount !== null &&
    before.amount !== after.amount
  ) {
    return { title: after.title, amountText: `${formatINR(before.amount)} → ${formatINR(after.amount)}` }
  }
  return {
    title: current.title,
    amountText: current.amount !== null ? formatINR(current.amount) : "—"
  }
}

export default function AuditTrail({ onRestored }) {
  const [entries, setEntries] = useState([])
  const [deletedRows, setDeletedRows] = useState([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [log, deleted] = await Promise.all([fetchAuditLog(100), fetchDeletedRows()])
      setEntries(log.entries)
      setAvailable(log.available && deleted.available)
      setDeletedRows(deleted.rows)
      if (log.error) setError(log.error)
    } catch (err) {
      setError(err.message || "Could not load the activity log.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRestore = async (row) => {
    setRestoringId(`${row._table}-${row.id}`)
    setNotice(null)
    try {
      await restoreRow(row._table, row.id)
      setNotice({
        type: "success",
        text: `Restored ${TABLE_LABELS[row._table] || row._table} #${row.id} back into the ledger.`
      })
      await load()
      if (onRestored) await onRestored()
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Could not restore the record." })
    } finally {
      setRestoringId(null)
    }
  }

  const lastChange = entries[0]?.happened_at

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <History className="w-4 h-4 text-navy mt-0.5" />
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                Activity &amp; Audit Trail
              </h2>
              <p className="text-[13px] text-gray-500 mt-0.5">
                Every addition, edit, deletion and restore — recorded automatically with who did it and when
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!available && (
            <div className="p-3.5 rounded-md text-[13px] font-medium flex items-start gap-2 border bg-amber-50 text-amber-900 border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                The audit trail is not enabled on the database yet. Run{" "}
                <code className="font-mono text-[12px] bg-white/70 px-1 py-0.5 rounded border border-amber-200">
                  supabase_setup_audit.sql
                </code>{" "}
                in the Supabase SQL Editor to start recording every change and enable restore.
              </span>
            </div>
          )}

          {notice && (
            <div
              className={`p-3.5 rounded-md text-[13px] font-medium border ${
                notice.type === "success"
                  ? "bg-white text-emerald-800 border-emerald-300"
                  : "bg-white text-red-800 border-red-300"
              }`}
            >
              {notice.text}
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-md text-[13px] font-medium border bg-white text-red-800 border-red-300">
              {error}
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Recorded changes
              </div>
              <span className="block mt-1 text-xl font-bold font-mono tabular-nums text-navy">
                {entries.length}
              </span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Last change
              </div>
              <span className="block mt-1 text-[13px] font-semibold text-navy">
                {lastChange ? formatWhen(lastChange) : loading ? "Loading…" : "No changes yet"}
              </span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Restorable (deleted)
              </div>
              <span className="block mt-1 text-xl font-bold font-mono tabular-nums text-navy">
                {deletedRows.length}
              </span>
            </div>
          </div>

          {/* Off-site backup status — stated honestly, including when it is off */}
          <div className="flex items-start gap-2 p-3 rounded-md border border-gray-200 bg-gray-50/60">
            {isGoogleBackupConfigured ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            )}
            <span className="text-[12px] text-gray-600">
              {isGoogleBackupConfigured ? (
                <>
                  <strong>Google Sheets backup: active.</strong> New transactions are also copied
                  off-site. Delivery is fire-and-forget (browser no-cors), so this is a convenience
                  copy — the audit trail above remains the source of truth.
                </>
              ) : (
                <>
                  <strong>Google Sheets backup: not set up.</strong> Every change is still recorded
                  in the audit trail above (Supabase). To also copy transactions to a Google Sheet,
                  set <code className="font-mono text-[11px] bg-white px-1 rounded border border-gray-200">VITE_GOOGLE_BACKUP_WEBHOOK_URL</code>{" "}
                  — the 2-minute setup steps are at the top of{" "}
                  <code className="font-mono text-[11px] bg-white px-1 rounded border border-gray-200">google-backup-script.js</code>.
                </>
              )}
            </span>
          </div>

          {/* Recently deleted */}
          {deletedRows.length > 0 && (
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50/70 border-b border-red-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
                  Recently deleted — restorable
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {deletedRows.map((row) => {
                  const summary = describeRow(row)
                  const key = `${row._table}-${row.id}`
                  return (
                    <div key={key} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            {TABLE_LABELS[row._table] || row._table}
                          </span>
                          <span className="text-[13px] font-medium text-gray-900 truncate">
                            {summary.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500">
                          {formatINR(summary.amount ?? 0)} · deleted {formatWhen(row.deleted_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestore(row)}
                        disabled={restoringId === key}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-navy bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-60 shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoringId === key ? "Restoring…" : "Restore"}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full log */}
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-500">Loading activity…</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              {available
                ? "No changes recorded yet. New activity will appear here automatically."
                : "Run supabase_setup_audit.sql to start the audit trail."}
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      When
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      Record
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const meta = ACTION_META[entry.action] || ACTION_META.update
                    const Icon = meta.icon
                    const summary = entrySummary(entry)
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50/70">
                        <td className="px-4 py-2.5 text-[12px] text-gray-600 whitespace-nowrap align-top">
                          {formatWhen(entry.happened_at)}
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${meta.badge}`}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            {TABLE_LABELS[entry.table_name] || entry.table_name} #{entry.row_id}
                          </div>
                          <div className="text-[13px] text-gray-900">{summary.title}</div>
                        </td>
                        <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-navy text-right whitespace-nowrap align-top">
                          {summary.amountText}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-500 align-top">
                          {entry.actor_email || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
