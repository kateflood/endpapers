import type { Project, WritingLog, ReferenceItem, ReferenceManifest, ReferenceGraph, ReferenceManifestEntry } from '@endpapers/types'

// ── Project ──────────────────────────────────────────────────────────────────

export const DEMO_PROJECT: Project = {
  id: 'demo-project',
  title: 'Goldilocks and the Three Bears',
  subtitle: 'A Classic Retelling',
  author: 'Jane Author',
  authorInfo: {
    firstName: 'Jane',
    lastName: 'Author',
    email: 'jane@example.com',
  },
  createdAt: '2026-01-15',
  updatedAt: '2026-02-24',
  sections: [
    {
      id: 'grp-bears', title: 'The Three Bears', type: 'group',
      children: [
        { id: 'sec-once', title: 'Once Upon a Time', type: 'section', file: 'sec-once.md' },
        { id: 'sec-walk', title: 'A Walk in the Woods', type: 'section', file: 'sec-walk.md' },
      ],
    },
    {
      id: 'grp-goldi', title: 'Goldilocks', type: 'group',
      children: [
        { id: 'sec-curious', title: 'The Curious Girl', type: 'section', file: 'sec-curious.md' },
        { id: 'sec-justright', title: 'Too Hot, Too Cold', type: 'section', file: 'sec-justright.md' },
      ],
    },
    { id: 'sec-return', title: 'The Bears Return', type: 'section', file: 'sec-return.md' },
  ],
  extras: [
    { id: 'sec-alt', title: 'Alternate Ending', type: 'section', file: 'sec-alt.md' },
  ],
  frontMatter: [
    { id: 'sec-title', title: 'Title Page', type: 'section', file: 'sec-title.md' },
  ],
  backMatter: [
    { id: 'sec-note', title: 'Author Note', type: 'section', file: 'sec-note.md' },
  ],
  settings: {
    spellCheck: true,
    paperMode: true,
    font: 'Georgia',
    fontSize: 18,
    wordsPerPage: 250,
    showWordCount: true,
  },
}

// ── Section content (HTML, as TipTap would produce) ──────────────────────────

export const DEMO_SECTIONS: Record<string, string> = {
  'sec-title.md': `<p style="text-align: center">&nbsp;</p>
<p style="text-align: center">&nbsp;</p>
<p style="text-align: center">&nbsp;</p>
<p style="text-align: center">&nbsp;</p>
<p style="text-align: center">&nbsp;</p>
<h1 style="text-align: center">Goldilocks and the Three Bears</h1>
<p style="text-align: center"><em>A Classic Retelling</em></p>
<p style="text-align: center">&nbsp;</p>
<p style="text-align: center">by Jane Author</p>`,

  'sec-once.md': `<p>Once upon a time, in a cozy cottage at the edge of a great forest, there lived three bears. There was <strong>Papa Bear</strong>, who was large and gruff but kind at heart. There was <strong>Mama Bear</strong>, who kept the house warm and the pantry full. And there was <strong>Baby Bear</strong>, who was small, cheerful, and curious about everything.</p>
<p>Every morning, Mama Bear would cook a pot of porridge for breakfast. She would ladle it into three bowls\u2014a great big bowl for Papa Bear, a medium-sized bowl for herself, and a wee little bowl for Baby Bear. The kitchen would fill with the sweet smell of oats and honey, and the bears would sit together at their wooden table, grateful for another day in their little home.</p>
<p>Their cottage was simple but well-loved. Papa Bear had carved the furniture himself\u2014three chairs of different sizes arranged by the fireplace, and three beds upstairs, each one perfectly suited to its owner. The garden out front was wild with lavender and rosemary, and a stone path wound from the front door to the forest trail.</p>
<p>It was, by all accounts, a perfectly happy life.</p>`,

  'sec-walk.md': `<p>One morning, Mama Bear set the porridge on the table as usual, but when she dipped her spoon to taste it, she pulled back with a frown.</p>
<p>\u201cThis porridge is far too hot to eat,\u201d she said, shaking her head. \u201cWe\u2019ll burn our tongues if we try.\u201d</p>
<p>Papa Bear peered into his great big bowl and nodded. \u201cYou\u2019re right. Let\u2019s take a walk in the woods while it cools down. The morning air will do us good.\u201d</p>
<p>Baby Bear clapped his paws. \u201cCan we go to the stream? I want to see the fish!\u201d</p>
<p>And so the three bears set off down the forest path, leaving their front door unlocked\u2014because in those days, in that part of the woods, nobody locked their doors. The porridge sat cooling on the table, the fire crackled gently in the hearth, and the cottage waited, quiet and still, for the bears to return.</p>
<p>They did not know that someone was watching from the tree line.</p>`,

  'sec-curious.md': `<p>Goldilocks was not the sort of girl who followed rules. She had been told, many times, not to wander too deep into the forest. But the morning was bright and the wildflowers were blooming, and one path led to another until she found herself in a part of the woods she had never seen before.</p>
<p>That was when she spotted the cottage.</p>
<p>It was charming\u2014a stone chimney, a thatched roof, and a garden full of herbs that smelled wonderful. Goldilocks walked up the stone path and knocked on the door. No one answered. She knocked again, then tried the handle.</p>
<p>The door swung open.</p>
<p>\u201cHello?\u201d she called. Silence. She stepped inside.</p>
<p>The first thing she noticed was the smell: warm porridge, sweet and inviting. Her stomach rumbled. She had been walking for hours and hadn\u2019t eaten since dawn. On the table sat three bowls of porridge, still faintly steaming.</p>
<p><em>Surely no one would mind</em>, she thought, <em>if I had just a taste.</em></p>`,

  'sec-justright.md': `<p>Goldilocks picked up the spoon beside the great big bowl and took a taste.</p>
<p>\u201cToo hot!\u201d she gasped, fanning her mouth.</p>
<p>She moved to the medium-sized bowl and tried that one.</p>
<p>\u201cToo cold,\u201d she muttered, wrinkling her nose.</p>
<p>Then she tried the wee little bowl. Her eyes widened. \u201cJust right,\u201d she whispered, and she ate it all up, scraping the bottom with the spoon.</p>
<p>Full and content, she wandered into the sitting room, where three chairs were arranged by the fireplace. The great big chair was too hard. The medium chair was too soft. But the wee little chair was just right\u2014until she leaned back and it broke into pieces beneath her.</p>
<p>\u201cOh dear,\u201d she said, but she didn\u2019t feel very sorry.</p>
<p>Yawning now, she climbed the stairs and found three beds. Papa Bear\u2019s bed was too firm. Mama Bear\u2019s bed was too squishy. But Baby Bear\u2019s bed was just right, and Goldilocks lay down, pulled the quilt to her chin, and fell fast asleep.</p>`,

  'sec-return.md': `<p>The bears came home in good spirits, pink-cheeked from the cold air, Baby Bear still chattering about the fish he\u2019d seen. But as soon as they stepped inside, Papa Bear stopped.</p>
<p>\u201cSomeone has been eating my porridge,\u201d he said in his great, gruff voice.</p>
<p>\u201cSomeone has been eating <em>my</em> porridge,\u201d said Mama Bear.</p>
<p>\u201cSomeone has been eating my porridge,\u201d cried Baby Bear, \u201cand they\u2019ve eaten it all up!\u201d</p>
<p>They moved to the sitting room. \u201cSomeone has been sitting in my chair,\u201d growled Papa Bear. \u201cSomeone has been sitting in <em>my</em> chair,\u201d said Mama Bear. \u201cSomeone has been sitting in my chair,\u201d wailed Baby Bear, \u201cand they\u2019ve broken it to bits!\u201d</p>
<p>Up the stairs they went. Papa Bear saw his rumpled pillow. Mama Bear saw her dented mattress. And Baby Bear crept to his bed and found a girl with golden curls, fast asleep.</p>
<p>\u201cSomeone is <em>sleeping</em> in my bed!\u201d he squeaked.</p>
<p>Goldilocks\u2019s eyes flew open. She saw three bears staring down at her\u2014one very large, one medium, one very small and very upset\u2014and she screamed, leapt from the bed, scrambled down the stairs, burst through the front door, and ran into the forest as fast as her legs could carry her.</p>
<p>The bears never saw her again. But from that day on, they always locked the door.</p>`,

  'sec-alt.md': `<p>In this version, Goldilocks doesn\u2019t run. Instead, she sits up in Baby Bear\u2019s bed, looks at the three startled faces, and says, \u201cI\u2019m terribly sorry. I was lost and hungry, and your home was so inviting. Please let me make it up to you.\u201d</p>
<p>The bears, surprised by her honesty, invited her to stay for supper. Goldilocks helped Mama Bear cook a fresh pot of porridge, and Papa Bear fixed Baby Bear\u2019s broken chair while Baby Bear showed Goldilocks his collection of interesting stones from the stream.</p>
<p>By evening, they were friends. Goldilocks walked home by the light of a lantern Papa Bear lent her, and she visited the cottage every Sunday after that.</p>`,

  'sec-note.md': `<p>Thank you for reading this little retelling. It was written to showcase the features of <strong>Endpapers</strong>, a writing app designed for authors who want to keep their work on their own computer.</p>
<p>As you explore this demo project, here are a few things to notice:</p>
<p>The <strong>sidebar on the left</strong> organizes sections into groups. The story chapters are grouped into \u201cThe Three Bears\u201d and \u201cGoldilocks,\u201d with the final chapter standing on its own. You can drag sections to reorder them or move them between groups.</p>
<p>The <strong>Drawer</strong> zone holds the alternate ending\u2014a section I wasn\u2019t sure about, so I set it aside without deleting it. The drawer is a good place for scenes you might use later.</p>
<p><strong>Front matter</strong> (the title page) and <strong>back matter</strong> (this note) are kept separate from the draft, so they don\u2019t clutter your chapter list but still appear in exports.</p>
<p>Try clicking <strong>Reference</strong> in the header to see characters and locations on an interactive board. And check the <strong>word count</strong> button in the header to see writing goals and progress tracking.</p>
<p>When you\u2019re ready to start your own project, head back to the home screen and click <strong>New project</strong>.</p>`,
}

// ── Writing log ──────────────────────────────────────────────────────────────

export const DEMO_WRITING_LOG: WritingLog = {
  goals: { session: 500, daily: 1000, weekly: 5000 },
  log: [
    { date: '2026-02-19', words: 750 },
    { date: '2026-02-20', words: 850 },
    { date: '2026-02-21', words: 1200 },
    { date: '2026-02-22', words: 600 },
    { date: '2026-02-23', words: 950 },
  ],
  lastKnownTotal: 4350,
}

// ── Reference data ───────────────────────────────────────────────────────────

export const DEMO_REFERENCE_COLLECTIONS: ReferenceManifest = {
  collections: [
    {
      type: 'character', label: 'Characters', builtIn: true,
      fields: [
        { key: 'role', label: 'Role', inputType: 'text' },
        { key: 'description', label: 'Description', inputType: 'textarea' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
    {
      type: 'location', label: 'Locations', builtIn: true,
      fields: [
        { key: 'description', label: 'Description', inputType: 'textarea' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
    {
      type: 'timeline', label: 'Timeline', builtIn: true,
      fields: [
        { key: 'date', label: 'Date', inputType: 'text' },
        { key: 'description', label: 'Description', inputType: 'textarea' },
      ],
    },
    {
      type: 'scenes', label: 'Scenes', builtIn: true,
      fields: [
        { key: 'setting', label: 'Setting', inputType: 'text' },
        { key: 'summary', label: 'Summary', inputType: 'textarea' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
    {
      type: 'notes', label: 'Notes', builtIn: true,
      fields: [{ key: 'content', label: 'Content', inputType: 'textarea' }],
    },
    {
      type: 'research', label: 'Research', builtIn: true,
      fields: [
        { key: 'source', label: 'Source', inputType: 'text' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
  ],
}

export const DEMO_REFERENCE_ITEMS: ReferenceItem[] = [
  {
    id: 'ref-goldi', type: 'character', name: 'Goldilocks',
    fields: { role: 'Protagonist', description: 'A curious girl with golden curls who wanders too deep into the forest and finds the bears\u2019 cottage.', notes: '' },
    position: { x: 100, y: 200 }, createdAt: '2026-01-15', updatedAt: '2026-02-24',
  },
  {
    id: 'ref-papa', type: 'character', name: 'Papa Bear',
    fields: { role: 'The Father', description: 'Large and gruff but kind at heart. Carved all the furniture in the cottage himself.', notes: '' },
    position: { x: 500, y: 100 }, createdAt: '2026-01-15', updatedAt: '2026-02-24',
  },
  {
    id: 'ref-mama', type: 'character', name: 'Mama Bear',
    fields: { role: 'The Mother', description: 'Keeps the house warm and the pantry full. Makes the porridge every morning.', notes: '' },
    position: { x: 500, y: 250 }, createdAt: '2026-01-15', updatedAt: '2026-02-24',
  },
  {
    id: 'ref-baby', type: 'character', name: 'Baby Bear',
    fields: { role: 'The Child', description: 'Small, cheerful, and curious. Collects interesting stones from the stream.', notes: '' },
    position: { x: 500, y: 400 }, createdAt: '2026-01-15', updatedAt: '2026-02-24',
  },
  {
    id: 'ref-cottage', type: 'location', name: 'The Bears\u2019 Cottage',
    fields: { description: 'A cozy stone cottage at the edge of a great forest with a thatched roof, stone chimney, and a garden of lavender and rosemary.', notes: '' },
    position: { x: 850, y: 200 }, createdAt: '2026-01-15', updatedAt: '2026-02-24',
  },
  {
    id: 'ref-forest', type: 'location', name: 'The Forest',
    fields: { description: 'A great, deep forest with winding paths, wildflowers, and a stream full of fish.', notes: '' },
    position: { x: 850, y: 400 }, createdAt: '2026-01-15', updatedAt: '2026-02-24',
  },
]

export const DEMO_REFERENCE_GRAPH: ReferenceGraph = {
  edges: [
    { id: 'edge-1', source: 'ref-goldi', target: 'ref-cottage', label: 'breaks into' },
    { id: 'edge-2', source: 'ref-papa', target: 'ref-cottage', label: 'lives in' },
    { id: 'edge-3', source: 'ref-mama', target: 'ref-cottage', label: 'lives in' },
    { id: 'edge-4', source: 'ref-baby', target: 'ref-cottage', label: 'lives in' },
    { id: 'edge-5', source: 'ref-goldi', target: 'ref-forest', label: 'wanders through' },
  ],
  annotations: [],
}

export const DEMO_REFERENCE_MANIFEST: Record<string, ReferenceManifestEntry[]> = {
  character: [
    { id: 'ref-goldi', type: 'item' },
    { id: 'ref-papa', type: 'item' },
    { id: 'ref-mama', type: 'item' },
    { id: 'ref-baby', type: 'item' },
  ],
  location: [
    { id: 'ref-cottage', type: 'item' },
    { id: 'ref-forest', type: 'item' },
  ],
}
