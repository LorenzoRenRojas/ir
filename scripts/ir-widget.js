// IR — iOS home screen widget (Scriptable)
//
// Setup:
//   1. Install "Scriptable" from the App Store (free)
//   2. Scriptable → + (new script) → paste this whole file
//   3. Name it "IR"
//   4. Set TOKEN below to the same value as WIDGET_TOKEN in Vercel
//   5. Home screen → long press → + → Scriptable → Medium widget
//   6. Long press the placed widget → Edit Widget → Script: IR

const BASE  = "https://ir-gov.app"
const TOKEN = "PASTE_YOUR_WIDGET_TOKEN_HERE"

const CRIMSON = new Color("#C41230")
const INK     = new Color("#0A0A0A")
const WHITE   = new Color("#FFFFFF")
const MUTED   = new Color("#FFFFFF", 0.45)
const FAINT   = new Color("#FFFFFF", 0.22)

async function fetchStats() {
  const req = new Request(`${BASE}/api/widget/stats?token=${encodeURIComponent(TOKEN)}`)
  req.timeoutInterval = 12
  return await req.loadJSON()
}

// A dash reads as "no data yet", which is honest. The API sends -1 when a
// individual count failed so one broken query never blanks the whole widget.
const show = (n) => (typeof n === "number" && n >= 0 ? String(n) : "—")

function statCell(row, label, value, accent) {
  const cell = row.addStack()
  cell.layoutVertically()
  cell.spacing = 1

  const v = cell.addText(value)
  v.font = Font.boldSystemFont(22)
  v.textColor = accent || WHITE

  const l = cell.addText(label)
  l.font = Font.mediumSystemFont(8)
  l.textColor = FAINT
}

async function build() {
  const w = new ListWidget()
  w.backgroundColor = INK
  w.setPadding(14, 16, 14, 16)

  let data
  try {
    data = await fetchStats()
  } catch (e) {
    const err = w.addText("IR")
    err.font = Font.boldSystemFont(13)
    err.textColor = CRIMSON
    w.addSpacer(6)
    const msg = w.addText("Can't reach stats. Check the token or connection.")
    msg.font = Font.systemFont(10)
    msg.textColor = MUTED
    return w
  }

  if (data && data.error) {
    const err = w.addText("IR")
    err.font = Font.boldSystemFont(13)
    err.textColor = CRIMSON
    w.addSpacer(6)
    const msg = w.addText(String(data.error))
    msg.font = Font.systemFont(10)
    msg.textColor = MUTED
    return w
  }

  // Header
  const head = w.addStack()
  head.centerAlignContent()
  const brand = head.addText("IR")
  brand.font = Font.boldSystemFont(13)
  brand.textColor = WHITE
  head.addSpacer(6)
  const kicker = head.addText("GOVCON INTELLIGENCE")
  kicker.font = Font.mediumSystemFont(8)
  kicker.textColor = FAINT
  head.addSpacer()
  const dot = head.addText("●")
  dot.font = Font.systemFont(8)
  dot.textColor = CRIMSON

  w.addSpacer(12)

  // The numbers that answer "is the outreach working?"
  const row = w.addStack()
  row.spacing = 0
  statCell(row, "USERS", show(data.users))
  row.addSpacer()
  statCell(row, "FOUNDING", show(data.founding), CRIMSON)
  row.addSpacer()
  statCell(row, "REFERRED", show(data.referred))
  row.addSpacer()
  statCell(row, "LIVE RFPs", show(data.liveContracts))

  w.addSpacer(10)

  // Footer line: today's movement, which is the part worth glancing at
  const foot = w.addStack()
  foot.centerAlignContent()
  const today = typeof data.signupsToday === "number" && data.signupsToday > 0
    ? `+${data.signupsToday} today`
    : "no signups today"
  const t = foot.addText(today)
  t.font = Font.mediumSystemFont(9)
  t.textColor = data.signupsToday > 0 ? CRIMSON : FAINT

  foot.addSpacer()

  const week = typeof data.signupsWeek === "number" ? `${data.signupsWeek} this week` : ""
  const wk = foot.addText(week)
  wk.font = Font.mediumSystemFont(9)
  wk.textColor = FAINT

  w.url = `${BASE}/admin`
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000)
  return w
}

const widget = await build()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
}
Script.complete()
