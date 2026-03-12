export default function ReferenceBoard() {
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text mb-2">Reference Board</h1>
        <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
          The reference board is an interactive canvas for tracking the people, places, and details that make up your story.
        </p>
      </div>

      <Section title="Collections">
        <p>
          Reference items are organized into collections — <strong>Characters</strong>, <strong>Locations</strong>, <strong>Timeline</strong>, <strong>Scenes</strong>, <strong>Notes</strong>, and <strong>Research</strong>. Each collection has its own set of fields.
        </p>
      </Section>

      <Section title="Board view">
        <p>
          The board view shows items as cards on an infinite canvas. Drag cards to arrange them however makes sense to you. You can also add <strong>annotations</strong> — rectangles and sticky notes — to organize your board visually.
        </p>
      </Section>

      <Section title="Connections">
        <p>
          Draw connections between items by dragging from one card's handle to another. Each connection can have a label (e.g. "lives in" or "sibling of"). Connections are visible as lines on the board.
        </p>
      </Section>

      <Section title="Grid view">
        <p>
          Switch to grid view for a tabular overview of all your items. You can filter by collection type and click an item to edit its details.
        </p>
      </Section>

      <Section title="Groups">
        <p>
          In the sidebar, you can organize items within a collection into groups — useful for grouping characters by faction, locations by region, or any other categorization.
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
