export default function ImportExport() {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text mb-2">Import & Export</h1>
        <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
          Bring existing writing into Endpapers, or export your project in a variety of formats.
        </p>
      </div>

      <Section title="Importing files">
        <p>
          Go to <strong>Settings → Import sections</strong> to import <code>.txt</code> or <code>.md</code> files as new sections. You can select multiple files at once.
        </p>
        <p>
          Choose which zone to add the imported sections to — Draft, Drawer, Front Matter, or Back Matter. If your files contain page break characters (form feed), you can split each file into multiple sections at those breaks.
        </p>
      </Section>

      <Section title="Export formats">
        <p>
          Go to <strong>Settings → Export project</strong> to export your manuscript. Available formats:
        </p>
        <ul className="list-disc list-inside ml-1 flex flex-col gap-1">
          <li><strong>Plain text</strong> — a simple <code>.txt</code> file with no formatting</li>
          <li><strong>PDF</strong> — uses your browser's print-to-PDF for a clean document</li>
          <li><strong>Word (.docx)</strong> — a standard Word document with basic formatting</li>
          <li><strong>Standard manuscript format</strong> — Courier 12pt, double-spaced, with proper headers and page breaks</li>
        </ul>
      </Section>

      <Section title="What gets exported">
        <p>
          Exports include your <strong>front matter</strong>, <strong>draft sections</strong>, and <strong>back matter</strong> in order. Drawer sections are not included. You can choose whether to show section titles in the export.
        </p>
      </Section>

      <Section title="Your files are always accessible">
        <p>
          Even without exporting, your sections are stored as individual <code>.md</code> files in the <code>sections/</code> folder of your project. You can open and edit them with any text editor.
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
