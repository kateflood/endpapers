export default function WritingGoals() {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text mb-2">Writing Goals</h1>
        <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
          Set word count targets and track your writing progress over time.
        </p>
      </div>

      <Section title="Opening the goals panel">
        <p>
          Click the word count in the editor header (e.g. "1,234 words · 5 pages") to toggle the writing goals panel on the right side of the editor.
        </p>
      </Section>

      <Section title="Setting targets">
        <p>
          You can set three types of goals:
        </p>
        <ul className="list-disc list-inside ml-1 flex flex-col gap-1">
          <li><strong>Session goal</strong> — words to write in the current session</li>
          <li><strong>Daily goal</strong> — words to write today</li>
          <li><strong>Weekly goal</strong> — words to write this week</li>
        </ul>
        <p>
          Enter a number and press Enter or click away to save. Clear the field to remove a goal.
        </p>
      </Section>

      <Section title="Progress tracking">
        <p>
          The goals panel shows your progress toward each target with a progress bar. Session progress is based on words written since you opened the project. Daily and weekly progress use your writing log.
        </p>
      </Section>

      <Section title="Writing log">
        <p>
          Endpapers records how many words you write each day in a log stored in your project folder. The log is displayed as a simple history list in the goals panel, so you can see your writing rhythm at a glance.
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[0.9375rem] font-semibold text-text mb-1.5">{title}</h2>
      <div className="text-[0.875rem] text-text-secondary leading-relaxed flex flex-col gap-2">
        {children}
      </div>
    </section>
  )
}
