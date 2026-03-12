export default function FrontBackMatter() {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text mb-2">Front & Back Matter</h1>
        <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
          Front and back matter sections sit outside your main draft. They appear in the sidebar below the drawer and are included when you export.
        </p>
      </div>

      <Section title="Front matter">
        <p>
          Front matter appears before your draft — title pages, copyright notices, dedications, epigraphs, and tables of contents. When exported, these sections are placed at the beginning of the document.
        </p>
      </Section>

      <Section title="Back matter">
        <p>
          Back matter appears after your draft — author notes, acknowledgments, appendices, and glossaries. These are placed at the end of the exported document.
        </p>
      </Section>

      <Section title="Adding sections">
        <p>
          Click the <strong>+</strong> button in the Front Matter or Back Matter header in the sidebar to add a new section to that zone. You can also import files directly into front or back matter via the Import dialog.
        </p>
      </Section>

      <Section title="Word count">
        <p>
          Front and back matter sections are not included in the word count or page count shown in the editor header. Only your main draft contributes to those totals.
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
