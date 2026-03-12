export default function SectionsAndGroups() {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text mb-2">Sections & Groups</h1>
        <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
          Your manuscript is made up of sections — individual pieces of writing that you can reorder, rename, and group however you like.
        </p>
      </div>

      <Section title="Creating sections">
        <p>
          Click the <strong>+ Section</strong> button at the bottom of the sidebar to add a new section. Each section is stored as a separate file in your project folder.
        </p>
      </Section>

      <Section title="Groups">
        <p>
          Use <strong>+ Group</strong> to create a container that holds multiple sections together — perfect for chapters, acts, or parts. Groups can be collapsed in the sidebar to keep things tidy.
        </p>
        <p>
          Drag sections into or out of groups to reorganize. Groups support one level of nesting — you can't put a group inside another group.
        </p>
      </Section>

      <Section title="Reordering">
        <p>
          Drag sections and groups by their grip handle to reorder them. You can move sections between groups, or pull them out to the top level.
        </p>
      </Section>

      <Section title="The drawer">
        <p>
          Below the main draft, there's a <strong>Drawer</strong> zone — a place to keep sections that aren't part of your manuscript yet. Use it for outtakes, alternate versions, or scenes you haven't placed.
        </p>
        <p>
          Drawer sections don't count toward your word count or page count.
        </p>
      </Section>

      <Section title="Renaming and deleting">
        <p>
          Right-click a section (or click the three-dot menu) to rename or delete it. Deleting a section removes the file from your project folder.
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
