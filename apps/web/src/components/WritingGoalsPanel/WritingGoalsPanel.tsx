import { useState, useEffect } from 'react'
import type { WritingLog, WritingGoals } from '@endpapers/types'
import { todayISODate, isThisWeek, isThisMonth, sumWritingLog } from '@endpapers/utils'
import { IconClose } from '../icons'

interface Props {
  writingLog: WritingLog
  sessionWords: number
  totalWords: number
  onUpdateGoals: (goals: WritingGoals) => Promise<void>
  onClose: () => void
}

function formatLogDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Goal row
// ---------------------------------------------------------------------------

interface GoalRowProps {
  label: string
  sublabel: string
  current: number
  goal: number | undefined
  draft: string
  onDraftChange: (v: string) => void
  onSave: (v: string) => void
}

function GoalRow({ label, sublabel, current, goal, draft, onDraftChange, onSave }: GoalRowProps) {
  const pct = goal ? Math.min(100, (current / goal) * 100) : null
  const met = goal !== undefined && current >= goal

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-[0.8125rem] font-medium text-text">{label}</span>
          <span className="text-[0.75rem] text-text-secondary ml-1.5">{sublabel}</span>
        </div>
        <span className={`text-[0.8125rem] shrink-0 tabular-nums ${met ? 'text-accent font-medium' : 'text-text-secondary'}`}>
          {current.toLocaleString()}{goal ? ` / ${goal.toLocaleString()}` : ''}
        </span>
      </div>
      {pct !== null && (
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-[0.75rem] text-text-placeholder">Goal</span>
        <input
          type="number"
          min="1"
          className="w-20 h-6 px-1.5 rounded-sm text-[0.75rem] text-text bg-bg border border-border outline-none focus:border-accent"
          value={draft}
          placeholder="—"
          onChange={e => onDraftChange(e.target.value)}
          onBlur={() => onSave(draft)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(draft) }}
        />
        <span className="text-[0.75rem] text-text-placeholder">words</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export default function WritingGoalsPanel({ writingLog, sessionWords, totalWords, onUpdateGoals, onClose }: Props) {
  const { goals, log, lastKnownTotal } = writingLog
  const today = todayISODate()

  // Words written since last flush (not yet in log)
  const unlogged = Math.max(0, totalWords - (lastKnownTotal ?? 0))

  const todayLogged = sumWritingLog(log, e => e.date === today)
  const dailyWords = todayLogged + unlogged
  const weeklyWords = sumWritingLog(log, e => isThisWeek(e.date) && e.date !== today) + dailyWords
  const monthlyWords = sumWritingLog(log, e => isThisMonth(e.date) && e.date !== today) + dailyWords

  // Editable goal drafts (empty string = not set)
  const [drafts, setDrafts] = useState({
    session: goals.session !== undefined ? String(goals.session) : '',
    daily:   goals.daily   !== undefined ? String(goals.daily)   : '',
    weekly:  goals.weekly  !== undefined ? String(goals.weekly)  : '',
    monthly: goals.monthly !== undefined ? String(goals.monthly) : '',
  })

  useEffect(() => {
    setDrafts({
      session: goals.session !== undefined ? String(goals.session) : '',
      daily:   goals.daily   !== undefined ? String(goals.daily)   : '',
      weekly:  goals.weekly  !== undefined ? String(goals.weekly)  : '',
      monthly: goals.monthly !== undefined ? String(goals.monthly) : '',
    })
  }, [goals])

  function saveGoal(key: keyof WritingGoals, value: string) {
    const n = parseInt(value, 10)
    const patch: WritingGoals = { ...goals, [key]: (!isNaN(n) && n > 0) ? n : undefined }
    void onUpdateGoals(patch)
  }

  // Recent log: last 7 entries excluding today, most recent first
  const recentLog = [...log]
    .filter(e => e.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 h-12 border-b border-border shrink-0">
        <span className="text-[0.9375rem] font-medium text-text flex-1">Writing Goals</span>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <IconClose size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hint when no goals are set */}
        {goals.session === undefined && goals.daily === undefined && goals.weekly === undefined && goals.monthly === undefined && log.length === 0 && (
          <p className="px-4 pt-3 text-[0.8125rem] text-text-placeholder">
            Set a writing goal to track your progress.
          </p>
        )}

        {/* Goals */}
        <div className="px-4 pt-1">
          <GoalRow
            label="Session" sublabel="this session"
            current={sessionWords} goal={goals.session}
            draft={drafts.session}
            onDraftChange={v => setDrafts(d => ({ ...d, session: v }))}
            onSave={v => saveGoal('session', v)}
          />
          <GoalRow
            label="Daily" sublabel="today"
            current={dailyWords} goal={goals.daily}
            draft={drafts.daily}
            onDraftChange={v => setDrafts(d => ({ ...d, daily: v }))}
            onSave={v => saveGoal('daily', v)}
          />
          <GoalRow
            label="Weekly" sublabel="this week"
            current={weeklyWords} goal={goals.weekly}
            draft={drafts.weekly}
            onDraftChange={v => setDrafts(d => ({ ...d, weekly: v }))}
            onSave={v => saveGoal('weekly', v)}
          />
          <GoalRow
            label="Monthly" sublabel="this month"
            current={monthlyWords} goal={goals.monthly}
            draft={drafts.monthly}
            onDraftChange={v => setDrafts(d => ({ ...d, monthly: v }))}
            onSave={v => saveGoal('monthly', v)}
          />
        </div>

        {/* Recent log */}
        {(dailyWords > 0 || recentLog.length > 0) && (
          <div className="px-4 pt-4 pb-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-2">Recent</p>
            <div className="flex flex-col gap-0.5">
              {dailyWords > 0 && (
                <div className="flex justify-between text-[0.8125rem] py-1">
                  <span className="text-text">Today</span>
                  <span className="text-text-secondary tabular-nums">{dailyWords.toLocaleString()} words</span>
                </div>
              )}
              {recentLog.map(entry => (
                <div key={entry.date} className="flex justify-between text-[0.8125rem] py-1">
                  <span className="text-text-secondary">{formatLogDate(entry.date)}</span>
                  <span className="text-text-secondary tabular-nums">{entry.words.toLocaleString()} words</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
