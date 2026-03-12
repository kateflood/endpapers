export default function GettingStarted() {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text mb-2">Getting Started</h1>
        <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
          Endpapers is a writing app that stores your projects as plain files on your computer. No accounts, no cloud — just your words in a folder you control.
        </p>
      </div>

      <Section title="Creating a project">
        <p>
          Click <strong>New project</strong> on the home screen, enter a title, and choose an empty folder. Endpapers will create a <code>project.json</code> file and a <code>sections/</code> folder inside it to hold your writing.
        </p>
      </Section>

      <Section title="Opening an existing project">
        <p>
          Click <strong>Open project</strong> and select a folder that already contains a <code>project.json</code> file. Recent projects are listed on the home screen for quick access.
        </p>
      </Section>

      <Section title="The editor">
        <p>
          The editor has three parts: a <strong>sections sidebar</strong> on the left for navigating your manuscript, the <strong>writing area</strong> in the center, and an optional <strong>writing goals panel</strong> on the right (click the word count in the header to toggle it).
        </p>
        <p>
          The toolbar at the top of the writing area lets you format text, insert images, and change the font. Use the sidebar to create, reorder, and group sections.
        </p>
      </Section>

      <Section title="Saving">
        <p>
          Changes are saved automatically as you type. There is no save button — your work is written to disk within a few seconds of each edit.
        </p>
      </Section>

      <Section title="Browser requirements">
        <p>
          Endpapers uses the File System Access API to read and write files on your computer. This API is available in <strong>Chrome</strong> and <strong>Edge</strong>. Safari and Firefox are not currently supported for local projects, but you can still explore the demo project.
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
