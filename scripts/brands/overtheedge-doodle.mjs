// Over the Edge's "Doodle" identity: the paper's social, slide and calendar system, as the team
// built it for 2025–27 (Instagram posts and stories, a reel cover, 16:9 slides, issue
// announcements and month stickers). Used by scripts/brands/overtheedge.mjs.
//
// The team's concept slide calls doodles "how students capture thoughts, ideas, dreams, and hopes
// while studying and writing". So the system is four flat colours (Cream, Forest, Lichen and Ink),
// Decalotype for headlines (Anton stands in), Helvetica Neue for reading, Salted for the
// handwritten accents, and a small set of line doodles: googly eyes, a calendar with a clock, a
// flame, a pencil, a paper plane and a spark. Around them: dashed rules, dashed boxes with rounded
// corners, tilted day tags and stickers, a crumpled sheet of paper, zigzag scribbles at the edges and
// OVER THE EDGE repeated as a faint ground.
//
// Everything that turns or tears is an illustration drawn once per template (brand.illustrations),
// because template rects and text cannot rotate; a drawing's text zones stay editable fields.

const r2 = (n) => Math.round(n * 100) / 100

// --- Doodles ---------------------------------------------------------------------------------------
// Each is drawn on a 100 × 100 grid with a 5-unit round stroke, as the identity's doodles are: one
// weight, round ends, no fill except pupils and dots. `c` is the colour.

const line = (c, width = 5) => `fill="none" stroke="${c}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`
export const DOODLES = {
  eyes: { name: 'Googly eyes', draw: (c) => `<g ${line(c)}><ellipse cx="33" cy="60" rx="19" ry="27"/><ellipse cx="71" cy="61" rx="17" ry="24"/><path d="M14 24Q28 10 44 20M58 25Q72 15 86 27"/></g><g fill="${c}"><ellipse cx="40" cy="66" rx="7" ry="10"/><ellipse cx="77" cy="66" rx="6" ry="9"/></g>` },
  calendar: { name: 'Calendar and clock', draw: (c) => `<g ${line(c)}><path d="M46 78H22Q10 78 10 66V34Q10 22 22 22H58Q70 22 70 34V46M10 40H70"/><circle cx="26" cy="17" r="6"/><circle cx="40" cy="17" r="6"/><circle cx="54" cy="17" r="6"/><circle cx="68" cy="70" r="22"/><path d="M68 58V70L77 77"/></g>` },
  flame: { name: 'Flame', draw: (c) => `<g ${line(c)}><path d="M50 94C27 94 13 77 16 58C19 40 33 34 33 16C43 24 47 34 46 44C53 36 57 22 54 6C72 18 88 40 85 62C82 82 69 94 50 94Z"/><path d="M50 86C40 86 35 78 37 70C39 63 45 61 47 54C54 61 62 66 61 74C60 81 56 86 50 86Z"/></g>` },
  pencil: { name: 'Pencil', draw: (c) => `<g ${line(c)}><path d="M14 86L20 66L68 18Q74 12 80 18L82 20Q88 26 82 32L34 80Z"/><path d="M20 66L34 80M60 26L74 40"/></g><path d="M14 86L17 76L24 83Z" fill="${c}"/>` },
  plane: { name: 'Paper plane', draw: (c) => `<g ${line(c)}><path d="M8 50L92 14L66 88L48 58Z"/><path d="M48 58L92 14M48 58L45 80L58 68"/></g>` },
  spark: { name: 'Spark', draw: (c) => `<g ${line(c)}><path d="M50 6L57 38L90 30L64 52L84 84L52 66L26 90L36 58L8 42L42 40Z"/></g><circle cx="50" cy="50" r="9" fill="${c}"/>` },
  scribble: { name: 'Scribble', draw: (c) => `<g ${line(c, 9)}><path d="M10 70L60 12M18 84L78 14M14 58L46 22M30 90L90 26M50 92L92 46M8 44L34 16M64 90L90 64M22 30L72 86"/></g>` }
}

/** A doodle placed in a `size` square at (x, y), turned `deg` about its centre. */
const doodleAt = (key, x, y, size, deg, colour, opacity = 1) => `<g transform="translate(${r2(x)} ${r2(y)}) rotate(${deg} ${r2(size / 2)} ${r2(size / 2)}) scale(${r2(size / 100)})"${opacity < 1 ? ` opacity="${opacity}"` : ''}>${DOODLES[key].draw(colour)}</g>`

// --- Shapes --------------------------------------------------------------------------------------

/** Four corners of a w × h box centred on (cx, cy), turned `deg`: top left first, clockwise. */
const quad = (cx, cy, w, h, deg) => {
  const a = (deg * Math.PI) / 180
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [r2(cx + x * Math.cos(a) - y * Math.sin(a)), r2(cy + x * Math.sin(a) + y * Math.cos(a))])
}
const poly = (points) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}Z`

/** A rounded rectangle as a path, for the identity's dashed boxes (template rects have no radius). */
const roundRect = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`

/** A small, repeatable random sequence, so drawings are the same on every build. */
const random = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

/** A wobbly blob around a w × h box: the sticker shape the month and date stickers sit on. */
const blob = (cx, cy, w, h, seed, wobble = 0.05) => {
  const next = random(seed)
  const points = Array.from({ length: 28 }, (_, i) => {
    const t = (i / 28) * Math.PI * 2
    // A superellipse keeps the long sides straight, like a capsule cut out with scissors.
    const k = 1 + (next() - 0.5) * wobble * 2
    const x = Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** 0.45 * (w / 2) * k
    const y = Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** 0.45 * (h / 2) * k
    return [cx + x, cy + y]
  })
  // Through the midpoints, so the outline is smooth.
  const mid = (a, b) => [r2((a[0] + b[0]) / 2), r2((a[1] + b[1]) / 2)]
  let d = `M${mid(points.at(-1), points[0]).join(' ')}`
  points.forEach((p, i) => { d += `Q${r2(p[0])} ${r2(p[1])} ${mid(p, points[(i + 1) % points.length]).join(' ')}` })
  return `${d}Z`
}

/** Creases for crumpled paper: long faint folds in ink, each with a white highlight beside it. */
const creases = (w, h, seed, count = 26) => {
  const next = random(seed)
  let dark = ''
  let light = ''
  for (let i = 0; i < count; i++) {
    const a = [next() * w, next() * h]
    const angle = next() * Math.PI
    const length = (0.25 + next() * 0.5) * Math.max(w, h)
    const bend = [a[0] + Math.cos(angle) * length / 2 + (next() - 0.5) * 60, a[1] + Math.sin(angle) * length / 2 + (next() - 0.5) * 60]
    const b = [a[0] + Math.cos(angle) * length, a[1] + Math.sin(angle) * length]
    const pts = [a, bend, b].map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ')
    const shifted = [a, bend, b].map(([x, y]) => `${r2(x + 3)},${r2(y + 2)}`).join(' ')
    dark += `<polyline points="${pts}"/>`
    light += `<polyline points="${shifted}"/>`
  }
  return { dark, light }
}

// --- The kit ---------------------------------------------------------------------------------------

/**
 * Symbols, illustrations, patterns, templates and sets for the Doodle identity.
 * `hex` resolves a palette key; `fonts` measures text; `words` is the logo's OVER THE EDGE lettering
 * (`d` and its `width` × `height`), used for the faint repeated ground.
 */
export const doodleKit = ({ hex, fonts, words }) => {
  const ILLUSTRATIONS = {}
  const width = (text, font, size) => fonts.width(text, font, size)

  /** Registers a drawing for one template and returns its element. */
  const drawing = (id, x, y, w, h, object, zones = [], fill = {}) => {
    ILLUSTRATIONS[id] = { title: `Over the Edge / ${id}`, viewBox: [0, 0, r2(w), r2(h)], object, zones: zones.map(([zone, corners]) => ({ id: zone, label: zone, kind: 'text', quad: corners, colour: 'ink' })) }
    return { type: 'illustration', id, illustration: id, x, y, width: r2(w), height: r2(h), zones: fill }
  }

  // OVER THE EDGE repeated in rows, each row shifted half a word, as the schedule posts' ground.
  const ghostWords = (id, w, h, colour, opacity, size = 300, angle = 0) => {
    const scale = size / words.width
    const rowH = words.height * scale * 1.6
    const ref = `${id}-words`
    let uses = ''
    for (let row = -1, y = -rowH; y < h + rowH * 2; row++, y += rowH) {
      for (let x = -size + (row % 2 ? size / 2 : 0) - size * 0.4; x < w + size; x += size * 1.12) uses += `<use href="#${ref}" transform="translate(${r2(x)} ${r2(y)}) scale(${r2(scale * 1000) / 1000})"/>`
    }
    const turn = angle ? ` transform="rotate(${angle} ${r2(w / 2)} ${r2(h / 2)})"` : ''
    return drawing(id, 0, 0, w, h, `<defs><path id="${ref}" d="${words.d}"/><clipPath id="${id}-clip"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#${id}-clip)"><g fill="${hex(colour)}" opacity="${opacity}"${turn}>${uses}</g></g>`)
  }

  /** A doodle on its own, `size` square, turned `deg`. */
  const doodle = (id, key, x, y, size, deg, colour, opacity = 1) => drawing(id, x, y, size, size, doodleAt(key, 0, 0, size, deg, hex(colour), opacity))

  /** A tilted tag (a day, a date): a slightly uneven quadrilateral with an editable label. */
  const tag = (id, cx, cy, w, h, deg, fill, field) => {
    const pad = Math.max(w, h) * 0.6
    const ox = cx - w / 2 - pad
    const oy = cy - h / 2 - pad
    const corners = quad(w / 2 + pad, h / 2 + pad, w, h, deg)
    // Nudged corners: cut by hand, not by a guillotine.
    const cut = corners.map(([x, y], i) => [r2(x + [2, -1, -3, 1][i] * w * 0.02), r2(y + [3, 0, -1, -2][i] * h * 0.015)])
    return drawing(id, ox, oy, w + pad * 2, h + pad * 2, `<path d="${poly(cut)}" fill="${hex(fill)}"/>`, [['label', quad(w / 2 + pad, h / 2 + pad, w * 0.84, h * 0.78, deg)]], { label: field })
  }

  /** A sticker: a blob in `fill` with a softer copy behind it, and an editable label. */
  const sticker = (id, cx, cy, w, h, deg, fill, halo, field, seed) => {
    const pad = Math.max(w, h) * 0.25
    const W = w + pad * 2
    const H = h + pad * 2
    const turn = `rotate(${deg} ${r2(W / 2)} ${r2(H / 2)})`
    return drawing(id, cx - W / 2, cy - H / 2, W, H,
      `<g transform="${turn}"><path d="${blob(W / 2 + w * 0.012, H / 2 + h * 0.05, w * 1.04, h * 1.1, seed)}" fill="${hex(halo)}" opacity="0.55"/><path d="${blob(W / 2, H / 2, w, h, seed + 7)}" fill="${hex(fill)}"/></g>`,
      [['label', quad(W / 2, H / 2, w * 0.86, h * 0.74, deg)]], { label: field })
  }

  /** A sheet of crumpled paper: a (possibly tilted) polygon, with folds clipped to it. */
  const paper = (id, x, y, w, h, corners, fill, seed, count) => {
    const { dark, light } = creases(w, h, seed, count)
    return drawing(id, x, y, w, h, `<defs><clipPath id="${id}-clip"><path d="${poly(corners)}"/></clipPath></defs><path d="${poly(corners)}" fill="${hex(fill)}"/><g clip-path="url(#${id}-clip)" fill="none" stroke-linecap="round"><g stroke="${hex('white')}" stroke-width="4" opacity="0.8">${light}</g><g stroke="${hex('ink')}" stroke-width="1.5" opacity="0.05">${dark}</g></g>`)
  }

  // --- Text helpers ------------------------------------------------------------------------------

  const t = (id, text, x, y, size, colour, extra = {}) => ({ type: 'text', id, text, x, y, size, colour, ...extra })
  const hand = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'hand', ...extra })
  const head = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'display', ...extra })
  const bold = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'bold', ...extra })
  const para = (id, text, x, y, w, size, colour, extra = {}) => ({ type: 'paragraph', id, text, x, y, width: w, size, leading: size * 1.25, colour, ...extra })
  const rect = (id, x, y, w, h, fill, extra = {}) => ({ type: 'rect', id, x, y, width: w, height: h, fill, ...extra })
  /** The identity's dashed rule: a thin ink line, short dashes. */
  const dash = (id, x1, x2, y, colour = 'ink', strokeWidth = 2) => ({ type: 'path', id, d: `M${x1} ${y}H${x2}`, fill: 'none', stroke: colour, strokeWidth, dash: '9 7' })
  const vdash = (id, x, y1, y2, colour = 'ink') => ({ type: 'path', id, d: `M${x} ${y1}V${y2}`, fill: 'none', stroke: colour, strokeWidth: 2, dash: '9 7' })
  const dashBox = (id, x, y, w, h, colour, extra = {}) => ({ type: 'path', id, d: roundRect(x, y, w, h, 12), fill: extra.fill ?? 'none', stroke: colour, strokeWidth: extra.strokeWidth ?? 2, dash: extra.dash ?? '9 7' })
  /** A Salted heading between two dashed rules: "SCHEDULE", "DEADLINE". */
  const ruled = (id, text, cx, y, size, colour, left, right, ground) => {
    const half = width(text, 'hand', size) / 2 + 28
    return [dash(`${id}-rule-left`, left, cx - half, y - size * 0.32, colour), hand(id, text, cx, y, size, colour, { anchor: 'middle', ground }), dash(`${id}-rule-right`, cx + half, right, y - size * 0.32, colour)]
  }
  /** "ISSUE #2": the word in ink, the number in an accent colour, both by hand. */
  const issue = (id, number, x, y, size, colour, accent, ground, anchor = 'start') => {
    const word = width('ISSUE ', 'hand', size)
    const total = word + width(number, 'hand', size)
    const left = anchor === 'middle' ? x - total / 2 : x
    return [hand(`${id}-word`, 'ISSUE', left, y, size, colour, { ground }), hand(`${id}-number`, number, left + word, y, size, accent, { ground })]
  }

  // --- Templates ---------------------------------------------------------------------------------

  const post = { width: 1080, height: 1350, raster: 1080 }
  const story = { width: 1080, height: 1920, raster: 1080 }
  const slide = { width: 1920, height: 1080, raster: 1920 }
  const THEMES = {
    cream: { ground: 'newsprint', ink: 'ink', accent: 'forest', tag: 'forest', tagText: 'newsprint', box: 'ink', sticker: 'forest', stickerText: 'newsprint', ghost: 'ink', ghostOpacity: 0.035, halo: 'lichen' },
    lichen: { ground: 'lichen', ink: 'ink', accent: 'forest', tag: 'forest', tagText: 'newsprint', box: 'ink', sticker: 'forest', stickerText: 'newsprint', ghost: 'ink', ghostOpacity: 0.035, halo: 'newsprint' },
    forest: { ground: 'forest', ink: 'newsprint', accent: 'lichen', tag: 'lichen', tagText: 'ink', box: 'lichen', sticker: 'newsprint', stickerText: 'forest', ghost: 'lichen', ghostOpacity: 0.04, halo: 'lichen' }
  }

  /** The schedule rows of the submission schedule: "ISSUE #n" by hand over a date, dashed rules between rows. */
  const issueGrid = (prefix, slots, top, step, ground, size = 46) => slots.flatMap(([column, row, number, date], index) => {
    const x = [64, 400, 736][column]
    const y = top + row * step
    return [...issue(`${prefix}-${index + 1}`, number, x, y, size, 'ink', 'forest', ground), t(`${prefix}-${index + 1}-date`, date, x, y + size * 0.95, size * 0.62, 'ink', { ground })]
  }).concat([0, 1, 2].map((row) => dash(`${prefix}-rule-${row + 1}`, 64, 1016, top + row * step + size * 1.5)))
  const SLOTS = [[0, 0, '[#2]', '[October 5]'], [2, 0, '[#8]', '[March 23]'], [0, 1, '[#3]', '[November 2nd]'], [2, 1, '[#7]', '[March 8]'], [0, 2, '[#4]', '[November 23]'], [1, 2, '[#5]', '[January 11]'], [2, 2, '[#6]', '[February 1]']]

  /** The week or weekend schedule, in one of the three grounds, as a post or a story. */
  const schedule = (id, label, size, theme, days, title) => {
    const th = THEMES[theme]
    const { width: W, height: H } = size
    const tall = H > 1500
    const top = tall ? 470 : 330
    const step = (H - top - (tall ? 120 : 60)) / days.length
    const boxH = step - (days.length > 2 ? 30 : 60)
    const titleSize = tall ? 120 : 104
    return {
      id, label, group: 'Schedules', title: `{name} / ${label.toLowerCase()} / ${W} × ${H}`, ...size,
      elements: [
        { type: 'background', fill: th.ground },
        ghostWords(`${id}-ground`, W, H, th.ghost, th.ghostOpacity, 520),
        hand('schedule-title-1', title[0], W * 0.42, tall ? 190 : 150, titleSize, th.ink, { anchor: 'middle' }),
        hand('schedule-title-2', title[1], W * 0.42, (tall ? 190 : 150) + titleSize * 1.02, titleSize, th.ink, { anchor: 'middle' }),
        sticker(`${id}-month`, W * 0.8, tall ? 210 : 165, 190, 160, -8, th.sticker, th.halo, { id: 'schedule-month', text: '[OCT]\n[2026]', font: 'hand', colour: th.stickerText }, 11),
        ...days.flatMap((day, index) => {
          const y = top + index * step
          return [
            dashBox(`day-box-${index + 1}`, 150, y, W - 214, boxH, th.box, { strokeWidth: 1.5, dash: '6 6' }),
            tag(`${id}-tag-${index + 1}`, 112, y + boxH / 2, days.length > 2 ? 108 : 168, days.length > 2 ? 108 : 150, index % 2 ? 4 : -5, th.tag, { id: `day-${index + 1}`, text: day, font: 'bold', colour: th.tagText })
          ]
        })
      ]
    }
  }

  /** The issue deadline post: a big flame behind, DEADLINE between dashed rules top and bottom. */
  const deadline = (id, label, theme) => {
    const cream = theme === 'cream'
    const ink = cream ? 'ink' : 'newsprint'
    const ground = cream ? 'newsprint' : 'forest'
    return {
      id, label, group: 'Instagram posts', title: `{name} / ${label.toLowerCase()} / 1080 × 1350`, ...post,
      elements: [
        { type: 'background', fill: ground },
        cream ? doodle(`${id}-flame`, 'flame', 140, 175, 800, 0, 'flame') : doodle(`${id}-flame`, 'flame', 140, 175, 800, 0, 'lichen', 0.07),
        ...ruled('deadline-top', 'DEADLINE', 540, 110, 54, ink, 64, 1016),
        ...issue('deadline-issue', '[#2]', 540, 650, 116, ink, cream ? 'ember' : 'newsprint', ground, 'middle'),
        t('deadline-date', '[October 5]', 540, 760, 64, ink, { anchor: 'middle' }),
        ...ruled('deadline-bottom', 'DEADLINE', 540, 1262, 54, ink, 64, 1016)
      ]
    }
  }

  /** The front-page index: three numbered headlines between dashed columns. */
  const frontIndex = (y, ground) => [0, 1, 2].flatMap((i) => [
    bold(`index-page-${i + 1}`, '[03]', 64 + i * 330, y, 46, 'ink', { ground }),
    para(`index-title-${i + 1}`, '[Headline]', 64 + i * 330, y + 52, 270, 26, 'ink', { maxLines: 3, ground }),
    ...(i < 2 ? [vdash(`index-rule-${i + 1}`, 364 + i * 330, y - 40, y + 130)] : [])
  ])

  const TEMPLATES = [
    {
      id: 'post-submission-schedule', label: 'Submission schedule', group: 'Instagram posts', title: '{name} / submission schedule / 1080 × 1350', ...post,
      elements: [
        { type: 'pattern', id: 'zigzag-ground', pattern: 'zigzag-frame', x: 0, y: 0, width: 1080, height: 1350, fit: 'cover' },
        { type: 'logo', x: 420, y: 96, width: 240, colour: 'lichen', family: 'words', ground: 'forest' },
        hand('schedule-years', '[2025–2026]', 540, 560, 66, 'newsprint', { anchor: 'middle', ground: 'forest' }),
        para('schedule-title', 'Submission Schedule', 540, 720, 820, 156, 'newsprint', { font: 'display', leading: 160, maxLines: 2, anchor: 'middle', ground: 'forest' }),
        doodle('post-submission-schedule-spark', 'spark', 380, 1112, 70, 0, 'lichen'),
        t('partner-intro', 'In partnership with', 460, 1150, 28, 'newsprint', { ground: 'forest' }),
        bold('partner-name', '[Partner]', 460, 1196, 40, 'newsprint', { ground: 'forest' })
      ]
    },
    {
      id: 'post-schedule', label: 'Issue schedule', group: 'Instagram posts', title: '{name} / issue schedule / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'newsprint' },
        ...ruled('schedule-heading', 'SCHEDULE', 540, 104, 56, 'ink', 64, 1016),
        doodle('post-schedule-calendar', 'calendar', 330, 150, 420, 0, 'forest'),
        ...issueGrid('slot', SLOTS, 720, 200, 'newsprint')
      ]
    },
    deadline('post-deadline', 'Deadline, cream', 'cream'),
    deadline('post-deadline-forest', 'Deadline, forest', 'forest'),
    {
      id: 'post-meet-the-board', label: 'Meet the board', group: 'Instagram posts', title: '{name} / meet the board / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'newsprint' },
        paper('post-meet-the-board-paper', 0, 0, 1080, 1350, [[0, 0], [1080, 0], [1080, 1350], [0, 1350]], 'newsprint', 94, 40),
        { type: 'logo', x: 64, y: 84, width: 180, colour: 'ink', family: 'words' },
        para('board-title', 'MEET\nTHE [2025–26] BOARD', 540, 250, 980, 92, 'forest', { font: 'display', leading: 100, maxLines: 2, anchor: 'middle' }),
        doodle('post-meet-the-board-eyes', 'eyes', 290, 360, 500, 0, 'ink'),
        hand('board-lead-left', 'WE’RE STUDENTS', 64, 1010, 32, 'ink'),
        para('board-copy-left', '(just like you), somehow in charge of a newspaper.', 64, 1052, 420, 30, 'ink', { maxLines: 3 }),
        hand('board-lead-right', 'WE WRITE, WE EDIT, AND WE CARE', 596, 1010, 32, 'ink'),
        para('board-copy-right', 'way too much about paragraph breaks.', 596, 1052, 420, 30, 'ink', { maxLines: 3 })
      ]
    },
    {
      id: 'post-board-member', label: 'Board member', group: 'Instagram posts', title: '{name} / board member / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'lichen' },
        ghostWords('post-board-member-ground', 1080, 560, 'ink', 0.06, 280, -14),
        head('member-role', '[PRESIDENT]', 540, 210, 76, 'ink', { anchor: 'middle' }),
        rect('member-photo', 290, 270, 500, 620, 'forest'),
        t('member-photo-note', '[Cut-out portrait]', 540, 590, 30, 'lichen', { anchor: 'middle', ground: 'forest' }),
        para('member-bio', '[Hi, I’m … and I’ve been at this school way too long.]', 64, 1010, 440, 30, 'ink', { maxLines: 5 }),
        para('member-fact', '[Fun fact: …]', 576, 1010, 440, 30, 'ink', { maxLines: 5 })
      ]
    },
    {
      id: 'post-issue-out', label: 'Issue is out', group: 'Instagram posts', title: '{name} / issue is out / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'forest' },
        (() => {
          // A tilted lichen strip printed with OVER THE EDGE, rows offset, cut off at the strip's edges.
          const W = 560
          const H = 1260
          const corners = quad(W / 2, H / 2, 460, 1180, 3)
          const scale = 290 / words.width
          let uses = ''
          for (let row = 0; row < 17; row++) for (let col = -1; col < 3; col++) uses += `<use href="#post-issue-out-words" transform="translate(${r2(col * 315 + (row % 2 ? 160 : 0) - 20)} ${r2(row * 78 - 10)}) scale(${r2(scale * 1000) / 1000})"/>`
          return drawing('post-issue-out-strip', 470, 45, W, H, `<defs><path id="post-issue-out-words" d="${words.d}"/><clipPath id="post-issue-out-clip"><path d="${poly(corners)}"/></clipPath></defs><path d="${poly(corners)}" fill="${hex('lichen')}"/><g clip-path="url(#post-issue-out-clip)"><g fill="${hex('forest')}" transform="rotate(3 ${W / 2} ${H / 2})">${uses}</g></g>`)
        })(),
        hand('issue-out-top', 'ISSUE [4] IS', 72, 190, 76, 'newsprint', { ground: 'forest' }),
        hand('issue-out-bottom', 'OUT!', 72, 1170, 92, 'newsprint', { ground: 'forest' })
      ]
    },
    {
      id: 'post-front-page', label: 'Front page', group: 'Instagram posts', title: '{name} / front page / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'newsprint' },
        bold('front-date', '[SEPTEMBER 3RD]', 64, 110, 40, 'ink'),
        hand('front-issue', 'ISSUE [1]', 560, 94, 40, 'forest', { anchor: 'middle' }),
        hand('front-volume', 'VOLUME [3+]', 560, 132, 28, 'forest', { anchor: 'middle' }),
        bold('front-year', '[2026]', 1016, 110, 40, 'ink', { anchor: 'end' }),
        rect('front-photo', 64, 170, 952, 560, 'forest'),
        t('front-photo-note', '[Cover photo]', 540, 460, 30, 'lichen', { anchor: 'middle', ground: 'forest' }),
        ...frontIndex(840, 'newsprint'),
        { type: 'logo', x: 64, y: 1140, width: 420, colour: 'ink' }
      ]
    },
    {
      id: 'post-front-page-tab', label: 'Front page, masthead tab', group: 'Instagram posts', title: '{name} / front page with masthead tab / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'newsprint' },
        bold('front-date', '[SEPTEMBER 3RD, 2026]', 64, 90, 30, 'ink'),
        hand('front-issue', 'ISSUE [1]', 64, 140, 34, 'forest'),
        hand('front-volume', 'VOLUME [3+]', 260, 140, 34, 'forest'),
        dash('front-rule', 64, 470, 168),
        vdash('front-divider', 520, 50, 175),
        bold('front-weather', '[WEATHER]', 1016, 120, 30, 'ink', { anchor: 'end' }),
        rect('front-photo', 64, 220, 952, 700, 'forest'),
        rect('masthead-tab', 290, 220, 500, 150, 'newsprint'),
        { type: 'logo', x: 320, y: 248, width: 440, colour: 'ink' },
        t('front-photo-note', '[Cover photo]', 540, 660, 30, 'lichen', { anchor: 'middle', ground: 'forest' }),
        ...frontIndex(1030, 'newsprint')
      ]
    },
    {
      id: 'post-schedule-paper', label: 'Schedule on paper', group: 'Instagram posts', title: '{name} / schedule on crumpled paper / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'forest' },
        paper('post-schedule-paper-sheet', 140, 30, 940, 1320, [[100, 0], [940, 50], [940, 1320], [0, 1320]], 'crumple', 116, 34),
        { type: 'logo', x: 470, y: 110, width: 360, colour: 'ink', ground: 'crumple' },
        sticker('post-schedule-paper-sticker', 380, 350, 400, 170, -7, 'lichen', 'newsprint', { id: 'sticker-text', text: 'FALL\nSCHEDULE', font: 'display', colour: 'forest', leading: 0.95, fill: 0.95 }, 23),
        ...[0, 1, 2].flatMap((row) => [
          ...issue(`paper-${row + 1}`, `[#${row + 2}]`, 300, 560 + row * 170, 60, 'ink', 'forest', 'crumple'),
          para(`paper-${row + 1}-date`, ['[Sept 25th, 2026]', '[Oct 30th, 2026]', '[Nov 27th, 2026]'][row], 720, 540 + row * 170, 280, 38, 'ink', { maxLines: 2, ground: 'crumple' }),
          dash(`paper-rule-${row + 1}`, 290, 1010, 640 + row * 170)
        ])
      ]
    },
    {
      id: 'post-season-schedule', label: 'Season schedule', group: 'Instagram posts', title: '{name} / season issue schedule / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'ink' },
        { type: 'logo', x: 340, y: 120, width: 400, colour: 'newsprint', ground: 'ink' },
        hand('season-years', '[2026–2027]', 540, 480, 70, 'newsprint', { anchor: 'middle', ground: 'ink' }),
        tag('post-season-schedule-band-1', 460, 600, 700, 140, -4, 'forest', { id: 'season-band-1', text: '[FALL & WINTER]', font: 'display', colour: 'newsprint' }),
        tag('post-season-schedule-band-2', 600, 740, 680, 120, -4, 'forest', { id: 'season-band-2', text: 'ISSUE SCHEDULE', font: 'display', colour: 'newsprint' })
      ]
    },
    schedule('post-week-schedule', 'Week schedule, cream', post, 'cream', ['MON\n[5]', 'TUE\n[6]', 'WED\n[7]', 'THU\n[8]', 'FRI\n[9]'], ['WEEK', 'SCHEDULE']),
    schedule('post-week-schedule-lichen', 'Week schedule, lichen', post, 'lichen', ['MON\n[5]', 'TUE\n[6]', 'WED\n[7]', 'THU\n[8]', 'FRI\n[9]'], ['WEEK', 'SCHEDULE']),
    schedule('post-week-schedule-forest', 'Week schedule, forest', post, 'forest', ['MON\n[5]', 'TUE\n[6]', 'WED\n[7]', 'THU\n[8]', 'FRI\n[9]'], ['WEEK', 'SCHEDULE']),
    schedule('post-weekend-schedule', 'Weekend schedule', post, 'forest', ['SAT\n[8]', 'SUN\n[9]'], ['WEEKEND', 'SCHEDULE']),
    schedule('story-week-schedule', 'Week schedule, story', story, 'cream', ['MON\n[5]', 'TUE\n[6]', 'WED\n[7]', 'THU\n[8]', 'FRI\n[9]'], ['WEEK', 'SCHEDULE']),
    {
      id: 'reel-cover', label: 'Reel cover', group: 'Stories and reels', title: '{name} / reel cover / 1080 × 1920', ...story,
      elements: [
        { type: 'background', fill: 'newsprint' },
        ...ruled('reel-years', '[2025–2026]', 540, 150, 56, 'ink', 64, 1016),
        head('reel-title', 'Submission', 540, 300, 132, 'forest', { anchor: 'middle' }),
        ...ruled('reel-schedule', 'SCHEDULE', 540, 410, 72, 'ink', 64, 1016),
        doodle('reel-cover-calendar', 'calendar', 260, 520, 560, 0, 'forest'),
        ...issueGrid('reel-slot', SLOTS, 1290, 200, 'newsprint', 50)
      ]
    },
    {
      id: 'story-issue-out', label: 'Issue is out, story', group: 'Stories and reels', title: '{name} / issue announcement story / 1080 × 1920', ...story,
      elements: [
        { type: 'background', fill: 'ink' },
        ...issue('story-issue', '[#2]', 540, 330, 150, 'newsprint', 'lichen', 'ink', 'middle'),
        t('story-issue-out', 'is out!', 540, 430, 72, 'newsprint', { anchor: 'middle', ground: 'ink' }),
        paper('story-issue-out-sheet', 150, 520, 780, 1180, [[0, 0], [780, 0], [780, 1180], [0, 1180]], 'lichen', 2, 30),
        t('story-photo-note', '[Cover of the issue]', 540, 1120, 34, 'forest', { anchor: 'middle', ground: 'lichen' }),
        { type: 'logo', x: 390, y: 1780, width: 300, colour: 'lichen', family: 'words', ground: 'ink' }
      ]
    },
    {
      id: 'story-write-for-us', label: 'Write for us, story', group: 'Stories and reels', title: '{name} / write for us story / 1080 × 1920', ...story,
      elements: [
        { type: 'background', fill: 'ink' },
        drawing('story-write-for-us-type', 160, 120, 760, 1400, '', [['line-1', quad(500, 700, 1400, 240, 90)], ['line-2', quad(230, 700, 1400, 240, 90)]], { 'line-1': { id: 'write-line-1', text: 'WRITE FOR', font: 'display', colour: 'lichen' }, 'line-2': { id: 'write-line-2', text: 'OVER THE EDGE', font: 'display', colour: 'lichen' } }),
        doodle('story-write-for-us-eyes', 'eyes', 600, 1500, 300, 90, 'lichen')
      ]
    },
    {
      id: 'calendar-month', label: 'Monthly calendar', group: 'Calendars and stickers', title: '{name} / monthly calendar / 1080 × 1350', ...post,
      elements: [
        { type: 'background', fill: 'newsprint' },
        sticker('calendar-month-sticker', 540, 150, 760, 150, -2, 'forest', 'lichen', { id: 'calendar-month', text: '[NOVEMBER 2026]', font: 'hand', colour: 'newsprint' }, 5),
        ...['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => bold(`weekday-${i + 1}`, day, 64 + i * 136 + 62, 330, 24, 'forest', { anchor: 'middle' })),
        ...Array.from({ length: 35 }, (_, i) => {
          const x = 64 + (i % 7) * 136
          const y = 360 + Math.floor(i / 7) * 190
          return [dashBox(`date-box-${i + 1}`, x + 4, y, 128, 176, 'ink', { strokeWidth: 1.5, dash: '6 6' }), ...(i < 30 ? [bold(`date-${i + 1}`, String(i + 1), x + 20, y + 40, 26, 'ink')] : [])]
        }).flat()
      ]
    },
    {
      id: 'month-sticker', label: 'Month sticker', group: 'Calendars and stickers', title: '{name} / month sticker / 800 × 240', width: 800, height: 240, raster: 1600,
      elements: [sticker('month-sticker-art', 400, 120, 700, 136, -1, 'forest', 'lichen', { id: 'sticker-month', text: '[NOVEMBER 2026]', font: 'hand', colour: 'newsprint' }, 5)]
    },
    {
      id: 'slide-cover-doodle', label: 'Slide, cover', group: 'Presentations', title: '{name} / 16:9 slide / doodle cover', ...slide,
      elements: [
        { type: 'background', fill: 'newsprint' },
        doodle('slide-cover-doodle-eyes', 'eyes', 820, 190, 300, 0, 'ink'),
        { type: 'logo', x: 400, y: 470, width: 1120, colour: 'forest' },
        t('slide-cover-note', '[Presentation title · date]', 960, 900, 30, 'ink', { anchor: 'middle' })
      ]
    },
    {
      id: 'slide-doodle', label: 'Slide, doodle wall', group: 'Presentations', title: '{name} / 16:9 slide / doodle wall', ...slide,
      elements: [
        { type: 'pattern', id: 'doodle-ground', pattern: 'doodle-wall', x: 0, y: 0, width: 1920, height: 1080, fit: 'cover' },
        rect('title-ground', 560, 380, 800, 320, 'lichen'),
        head('wall-title', 'Doodle', 960, 630, 250, 'ink', { anchor: 'middle', ground: 'lichen' })
      ]
    },
    {
      id: 'slide-content-doodle', label: 'Slide, content', group: 'Presentations', title: '{name} / 16:9 slide / content', ...slide,
      elements: [
        { type: 'background', fill: 'newsprint' },
        t('slide-kicker-left', 'OTE', 96, 90, 22, 'ink'),
        t('slide-kicker-centre', '[concept]', 960, 90, 22, 'ink', { anchor: 'middle' }),
        t('slide-kicker-right', '[description]', 1824, 90, 22, 'ink', { anchor: 'end' }),
        dash('slide-rule', 96, 1824, 140),
        doodle('slide-content-doodle-eyes', 'eyes', 120, 230, 200, 0, 'ink'),
        para('slide-body', '[Over the Edge is a student-run newspaper and creative platform that gives students space to share their voices, perspectives, and ideas.]', 380, 300, 1300, 44, 'ink', { maxLines: 8, leading: 60 }),
        doodle('slide-content-doodle-calendar', 'calendar', 1520, 760, 230, 0, 'forest')
      ]
    },
    {
      id: 'slide-colourways', label: 'Slide, colourways', group: 'Presentations', title: '{name} / 16:9 slide / logo colourways', ...slide,
      elements: [
        { type: 'background', fill: 'newsprint' },
        rect('panel-ink', 0, 0, 600, 430, 'ink'),
        { type: 'logo', x: 70, y: 75, width: 420, colour: 'lichen', layout: 'stacked', ground: 'ink' },
        rect('panel-lichen', 600, 0, 600, 430, 'lichen'),
        { type: 'logo', x: 670, y: 75, width: 420, colour: 'forest', layout: 'stacked', ground: 'lichen' },
        rect('panel-forest', 0, 430, 1200, 650, 'forest'),
        { type: 'logo', x: 260, y: 555, width: 640, colour: 'newsprint', layout: 'stacked', ground: 'forest' },
        { type: 'logo', x: 1290, y: 260, width: 560, colour: 'forest', layout: 'stacked' },
        t('colourways-note', '[Over the Edge, four ways]', 1290, 900, 28, 'ink')
      ]
    },
    {
      id: 'poster-write-for-us', label: 'Write for us, A4 poster', group: 'Posters', title: '{name} / write for us poster / A4', width: 794, height: 1123, physical: ['210mm', '297mm'], raster: 1588,
      elements: [
        { type: 'background', fill: 'newsprint' },
        doodle('poster-write-for-us-eyes', 'eyes', 520, 40, 230, 0, 'ink'),
        para('poster-title', 'WRITE FOR\nOVER THE EDGE', 56, 320, 690, 84, 'forest', { font: 'display', leading: 88, maxLines: 2 }),
        dash('poster-rule-0', 56, 738, 420),
        hand('poster-list-heading', 'WHAT YOU CAN WRITE', 56, 480, 34, 'ink'),
        ...['[News]', '[Features]', '[Opinion]', '[Arts and culture]', '[Campus life]'].flatMap((item, i) => [t(`poster-item-${i + 1}`, item, 56, 540 + i * 58, 24, 'ink'), dash(`poster-rule-${i + 1}`, 56, 520, 556 + i * 58)]),
        doodle('poster-write-for-us-pencil', 'pencil', 580, 520, 160, 0, 'forest'),
        dashBox('poster-qr', 56, 860, 180, 180, 'ink'),
        t('poster-qr-note', '[QR code]', 146, 957, 18, 'ink', { anchor: 'middle' }),
        para('poster-cta', 'SCAN. CLICK. JOIN THE EDGE.', 262, 930, 240, 30, 'forest', { font: 'hand', maxLines: 2 }),
        { type: 'logo', x: 588, y: 880, width: 150, colour: 'forest', layout: 'stacked' }
      ]
    }
  ]

  const SETS = [
    { id: 'week-schedule', label: 'Week schedule', group: 'Schedules', variants: [['post-week-schedule', 'cream'], ['post-week-schedule-lichen', 'lichen'], ['post-week-schedule-forest', 'forest'], ['story-week-schedule', 'story']].map(([template, label]) => ({ template, label })) },
    { id: 'deadline', label: 'Deadline', group: 'Instagram posts', variants: [['post-deadline', 'cream'], ['post-deadline-forest', 'forest']].map(([template, label]) => ({ template, label })) }
  ]

  // --- Symbols and patterns ------------------------------------------------------------------------
  // The doodles as brand symbols, in {ink} so a pattern can paint them any palette colour, and the
  // logo's lettering at four per cent: the faint OVER THE EDGE ground of the schedule posts.

  const SYMBOLS = {
    ...Object.fromEntries(Object.entries(DOODLES).map(([key, { name, draw }]) => [`doodle-${key}`, { name: `doodle-${key}`, title: `${name} / doodle`, viewBox: [0, 0, 100, 100], markup: draw('{ink}') }])),
    'edge-words': { name: 'edge-words', title: 'OVER THE EDGE, the logo’s lettering', viewBox: [0, 0, words.width, words.height], markup: `<path d="${words.d}"/>` }
  }

  // The doodle wall: every doodle, turned this way and that, in a jittered grid.
  const wall = []
  const next = random(3)
  const keys = ['eyes', 'flame', 'pencil', 'plane', 'calendar', 'spark']
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 10; col++) {
      const size = 108 + next() * 30
      wall.push({ symbol: `doodle-${keys[(row * 4 + col) % keys.length]}`, x: r2(col * 100 - 40 + (row % 2 ? 50 : 0) + next() * 20), y: r2(row * 108 - 50 + next() * 20), scale: r2(size / 100), rotation: r2((next() - 0.5) * 70), colour: 'forest' })
    }
  }
  // Zigzag scribbles along every edge, as the submission schedule's frame.
  const zig = (from, to, depth, steps, seed) => {
    const nextZ = random(seed)
    const points = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const out = i % 2 ? depth * (0.4 + nextZ() * 0.6) : nextZ() * 8
      points.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, out])
    }
    return points
  }
  const edge = (points, axis, sign, origin) => points.map(([x, y, out]) => (axis === 'x' ? [r2(origin + sign * out), r2(y)] : [r2(x), r2(origin + sign * out)]))
  const FRAME = { width: 1080, height: 1350 }
  const zigzags = [
    edge(zig([0, 0], [0, 1350], 120, 22, 4), 'x', 1, 2), edge(zig([0, 0], [0, 1350], 70, 30, 9), 'x', 1, 2),
    edge(zig([1078, 0], [1078, 1350], 120, 22, 5), 'x', -1, 1078), edge(zig([1078, 0], [1078, 1350], 70, 30, 6), 'x', -1, 1078),
    edge(zig([0, 2], [1080, 2], 110, 18, 7), 'y', 1, 2), edge(zig([0, 1348], [1080, 1348], 110, 18, 8), 'y', -1, 1348)
  ].map((points) => ({ points, colour: 'lichen', width: 5 }))

  const PATTERNS = [
    { id: 'doodle-wall', title: '{name} / doodle wall', width: 960, height: 600, background: 'lichen', place: wall },
    { id: 'doodle-set', title: '{name} / the doodles', width: 960, height: 600, background: 'newsprint', place: keys.concat('scribble').map((key, i) => ({ symbol: `doodle-${key}`, x: 60 + (i % 4) * 230, y: i < 4 ? 70 : 330, scale: 1.7, colour: i % 2 ? 'ink' : 'forest' })) },
    { id: 'edge-ghost', title: '{name} / OVER THE EDGE ground', width: 960, height: 600, background: 'newsprint', place: Array.from({ length: 12 }, (_, i) => ({ symbol: 'edge-words', x: (i % 3) * 340 - 120 + (Math.floor(i / 3) % 2 ? 170 : 0), y: Math.floor(i / 3) * 150 + 20, scale: r2(300 / words.width), colour: 'haze' })) },
    { id: 'zigzag-frame', title: '{name} / zigzag frame', ...FRAME, background: 'forest', lines: zigzags }
  ]

  return { templates: TEMPLATES, sets: SETS, illustrations: ILLUSTRATIONS, symbols: SYMBOLS, patterns: PATTERNS }
}
