// One-shot data migration (PLE-154): ingest Master Person–Relationship Index
// v1.0 into nodes.yaml. ADDITIVE — enriches the 15 existing person nodes with a
// `person` profile and appends 2 net-new person nodes (Tony Winters, Christy
// Price). Targeted text insertion keeps the file header, citations, and every
// other node byte-identical; only the touched person blocks change.
import { readFileSync, writeFileSync } from "node:fs";
import { stringify } from "yaml";

const FILE = new URL("../public/data/nodes.yaml", import.meta.url);
let text = readFileSync(FILE, "utf8");

const BANK_NOTE =
  "A bank's willingness to finance a 3D-printed residence is an independent market signal of legitimacy and demand.";

// rel(date, scheduled, description, ids, titles)
const rel = (date, scheduled, description, connectedNodeIds, connectedNodeTitles) =>
  ({ date, scheduled, description, connectedNodeIds, connectedNodeTitles });

// ── Profiles for the 15 EXISTING person nodes (additive) ─────────────────────
const profiles = {
  "n-kayla-lee": {
    name: "Kayla Lee, NCARB",
    role: "Founder & Architect, Lee Simon Design",
    initialAppearanceDate: "2026-01-20",
    threads: ["foundational", "major_projects", "strategic_relationships", "media_brand"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-01-20", false, "First meeting with Lawrence Gene; conceptual origin of Pleet LLC. (Kayla had long been an owner — now the owner — of Lee Simon Design.)", ["n-kayla-first-meeting"], ["First meeting with Kayla Lee, NCARB"]),
      rel("2026-02-02", false, "Co-filed/formed Pleet LLC with Lawrence Gene.", ["n-pleet-formed"], ["Pleet LLC officially formed"]),
      rel("2026-03-05", false, "Participated in the Tulsa Home & Garden Show booth for Pleet LLC (Mar 5–8).", ["n-tulsa-home-garden-show"], ["Tulsa Home & Garden Show"]),
      rel("2026-04-02", false, "Copied on Lawrence Gene's reply to Brady Deaton's initial inquiry.", ["n-pleet-reply"], ["Pleet (LG) replies \"Re:3D Print\""]),
      rel("2026-05-28", false, "Toured Savanna Schools grounds and building with Lawrence Gene and Kenny; took photos and assessed topography.", ["n-savanna-approval", "n-adam-newman"], ["Savanna Schools — board presentations & approval", "Adam Newman"]),
      rel("2026-06-01", false, "Attended Savanna Schools board meeting; presented 3D printing concepts — board unanimously approved.", ["n-savanna-approval"], ["Savanna Schools — board presentations & approval"]),
      rel("2026-06-11", false, "Attended \"Lunch with Bo\" with Brady Deaton, Bo Jett (IBC Bank), and Lawrence Gene.", ["n-lunch-with-bo", "n-bo-jett"], ["\"Lunch with Bo\"", "Bo Jett"]),
      rel("2026-06-15", false, "Received architectural pricing request from Nick Denison for Clear Creek Butterfly (his personal home); Joshua Bowers copied.", ["n-clear-creek-butterfly", "n-nick-denison", "n-joshua"], ["Clear Creek Butterfly", "Nick Denison", "Joshua Bowers"]),
      rel("2026-06-23", true, "Scheduled to attend meeting with Mayor Monroe Nichols at Tulsa City Hall.", ["n-mayor-meeting", "n-mayor-nichols"], ["Meeting with Mayor Monroe Nichols", "Mayor Monroe Nichols"]),
    ],
  },
  "n-aiman-hussain": {
    name: "Aiman Hussain",
    role: "SQ4D (New York)",
    initialAppearanceDate: "2026-01-28",
    threads: ["foundational", "manufacturing"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-01-28", false, "First text-message contact with Lawrence Gene.", ["n-sq4d-contact"], ["First contact with Aiman Hussein (SQ4D)"]),
      rel("2026-02-02", false, "Formal conversations on the SQ4D ARC ARCH 4.2 XL machine; LG soon presented it to Kayla Lee as the most viable option.", ["n-sq4d-contact", "n-oklahoma-manufacturing"], ["First contact with Aiman Hussein (SQ4D)", "Oklahoma Manufacturing Imperative"]),
      rel("2026-08-13", true, "Attending the OSSBA Convention (Savanna Schools thread).", ["n-savanna-ossba"], ["Savanna Schools — OSSBA Convention"]),
    ],
  },
  "n-brady-deaton": {
    name: "Brady Deaton",
    role: "Business Development, Rise Up Restoration / Rise Up Properties OK",
    initialAppearanceDate: "2026-04-01",
    threads: ["growth", "major_projects", "strategic_relationships", "financial_interest"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-04-01", false, "Sent initial inbound email inquiry (\"3D Print\") expressing interest in 3D printing a house.", ["n-brady-inquiry"], ["Brady Deaton inbound inquiry — \"3D Print\""]),
      rel("2026-04-02", false, "Received reply from Lawrence Gene (Kayla Lee copied) re land, site visits, and architectural plans.", ["n-pleet-reply"], ["Pleet (LG) replies \"Re:3D Print\""]),
      rel("2026-04-06", false, "Organized/attended \"Lunch with Pleet\" at Waterfront Grill (Jenks) with LG and Nick Denison.", ["n-lunch-with-pleet", "n-nick-denison"], ["\"Lunch with Pleet\"", "Nick Denison"]),
      rel("2026-04-08", false, "Shared Skyland 3D ROM estimate (competing bid) for his home + recording studio; introduced the Muskogee project.", ["n-skyland-rom"], ["Skyland 3D ROM estimate (competing bid)", "Muskogee project introduction"]),
      rel("2026-04-09", false, "Tony Winters (ORU) meeting re the Muskogee housing development.", ["n-tony-winters"], ["Tony Winters", "Muskogee project"]),
      rel("2026-04-14", false, "Introduced Adam Newman / Savanna Schools to Lawrence Gene.", ["n-savanna-intro", "n-adam-newman"], ["Introduction to Savanna Schools via Adam Newman", "Adam Newman"]),
      rel("2026-04-23", false, "Organized/attended \"Meet Bo & LG\" — introduced Bo Jett (IBC Bank) to Lawrence Gene.", ["n-meet-bo", "n-bo-jett"], ["\"Meet Bo & LG\"", "Bo Jett"]),
      rel("2026-04-23", false, "Introduced White Wolf Creative (Paul Lawson & Nick Bright) to Lawrence Gene.", ["n-whitewolf-intro", "n-paul-lawson", "n-nick-bright"], ["Brady introduces White Wolf Creative", "Paul Lawson", "Nick Bright"]),
      rel("2026-06-11", false, "Organized/attended \"Lunch with Bo\" with Bo Jett, Lawrence Gene, and Kayla Lee.", ["n-lunch-with-bo", "n-bo-jett", "n-kayla-lee"], ["\"Lunch with Bo\"", "Bo Jett", "Kayla Lee"]),
      rel("2026-06-15", false, "Strategy meeting with White Wolf Creative, Amy Addington Smith, and LG re Pleet TV pilot & sponsors.", ["n-strategy-meeting-pleet-tv", "n-pleet-tv", "n-amy-addington-smith"], ["Strategy meeting — Pleet TV pilot episode & sponsors", "\"Pleet TV\"", "Amy Addington Smith"]),
      rel("2026-06-23", true, "Scheduled to attend meeting with Mayor Monroe Nichols.", ["n-mayor-meeting", "n-mayor-nichols"], ["Meeting with Mayor Monroe Nichols", "Mayor Monroe Nichols"]),
      rel("2026-06-25", true, "Organized \"Meeting with Gateway\" at Colab Coffee with Hayden Hanoch (Gateway Bank) and LG.", ["n-meeting-gateway", "n-hayden-hanoch"], ["\"Meeting with Gateway\"", "Hayden Hanoch"]),
      rel(null, false, "Brady Deaton's home (Sand Springs) — financed by Bo Jett / IBC Bank.", ["n-brady-home", "n-bo-jett"], ["Brady Deaton's Home — Sand Springs", "Bo Jett"]),
    ],
  },
  "n-nick-denison": {
    name: "Nick Denison",
    role: "Principal & Owner, 1 Architecture (Tulsa, OK)",
    initialAppearanceDate: "2026-04-06",
    threads: ["growth", "major_projects", "strategic_relationships"],
    modalGraphic: null,
    note: "Cherokee Nation housing opportunity is linked via 1 Architecture's reported $40M contract — details to be verified (open flag, source ledger).",
    relationships: [
      rel("2026-04-06", false, "Attended \"Lunch with Pleet\" with Brady Deaton and Lawrence Gene at Waterfront Grill.", ["n-lunch-with-pleet", "n-brady-deaton"], ["\"Lunch with Pleet\"", "Brady Deaton"]),
      rel("2026-06-01", false, "Introduced Lawrence Gene to Daniel Regan (Tulsa International Airport).", ["n-daniel-regan"], ["Daniel Regan"]),
      rel("2026-06-15", false, "Emailed Kayla Lee requesting a full construction-services bid for Clear Creek Butterfly (his personal home); Joshua Bowers and LG copied.", ["n-clear-creek-butterfly", "n-kayla-lee", "n-joshua"], ["Clear Creek Butterfly", "Kayla Lee", "Joshua Bowers"]),
      rel(null, false, "Connected to the Cherokee Nation housing opportunity through 1 Architecture's reported $40M contract (to be verified).", ["n-cherokee-nation-housing"], ["Cherokee Nation Housing opportunity"]),
      rel(null, false, "Connected to the Spoke House (bike shop) opportunity.", ["n-spoke-house"], ["Spoke House — bike shop"]),
    ],
  },
  "n-adam-newman": {
    name: "Adam Newman",
    role: "Superintendent, Savanna Schools (Savanna, Oklahoma)",
    initialAppearanceDate: "2026-04-14",
    threads: ["savanna"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-04-14", false, "Introduced to Lawrence Gene by Brady Deaton as the Savanna Schools project contact.", ["n-savanna-intro", "n-brady-deaton"], ["Introduction to Savanna Schools via Adam Newman", "Brady Deaton"]),
      rel("2026-05-22", false, "Met with Lawrence Gene, Brady Deaton, and Christy Price.", ["n-brady-deaton", "n-christy-price"], ["Brady Deaton", "Christy Price", "Savanna Schools"]),
      rel("2026-05-28", false, "Hosted Lawrence Gene and Kayla Lee on a site tour of the school grounds (with Kenny).", ["n-kayla-lee"], ["Kayla Lee", "Savanna Schools site tour"]),
      rel("2026-06-01", false, "Participated in the Savanna Schools board meeting — 3D printing concepts presented and unanimously approved.", ["n-savanna-approval"], ["Savanna Schools — board presentations & approval"]),
      rel(null, false, "Savanna Schools bond process: failed April 2026 bond → successful June 2026 board approval.", ["n-savanna-bond-fail", "n-savanna-approval"], ["Savanna Schools — first bond fails", "Savanna Schools — board presentations & approval"]),
      rel(null, true, "Future school printing window (Feb–Apr 2027).", ["n-savanna-printing"], ["Savanna Schools — School printing window"]),
    ],
  },
  "n-daniel-regan": {
    name: "Daniel Regan",
    role: "Director of Real Estate & Business Development, Tulsa Airports Improvement Trust (Tulsa International Airport)",
    initialAppearanceDate: "2026-06-01",
    threads: ["strategic_relationships", "manufacturing"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-06-01", false, "Introduced to Lawrence Gene by Nick Denison.", ["n-nick-denison"], ["Nick Denison"]),
      rel(null, false, "Discussed using a large airplane hangar at Tulsa International Airport for SQ4D manufacturing (4-stage zone: fabrication, assembly, testing, tear-down/shipping).", ["n-oklahoma-manufacturing", "n-equipment-demand"], ["Oklahoma Manufacturing Imperative", "Equipment Demand N(t)"]),
    ],
  },
  "n-amy-addington-smith": {
    name: "Amy Addington Smith",
    role: "Former Channel 6 TV personality (Tulsa); podcast and speaking-format interests",
    initialAppearanceDate: "2026-06-12",
    threads: ["media_brand"],
    modalGraphic: null,
    note: "Distinct from Amy K. Cook (BancFirst). Currently treated as two separate individuals pending confirmation.",
    relationships: [
      rel("2026-06-12", false, "First meeting with Lawrence Gene (and husband) to discuss the 3D printing business and public engagement.", ["n-amy-addington-first-meeting"], ["First meeting with Amy Addington Smith (media partner)"]),
      rel("2026-06-15", false, "Participated in strategy meeting with White Wolf Creative, Brady Deaton, Christy Price, and LG re Pleet TV pilot & sponsors.", ["n-strategy-meeting-pleet-tv", "n-pleet-tv", "n-christy-price"], ["Strategy meeting — Pleet TV pilot episode & sponsors", "\"Pleet TV\"", "Christy Price"]),
    ],
  },
  "n-amy-bancfirst": {
    name: "Amy K. Cook",
    role: "Executive Vice President, BancFirst — Jenks, OK Branch",
    initialAppearanceDate: null,
    threads: ["financial_interest"],
    modalGraphic: null,
    note: "Distinct from Amy Addington Smith. Currently treated as two separate individuals pending confirmation. Specific meeting dates with Lawrence Gene are not yet detailed in the record — flagged for confirmation per the source ledger.",
    relationships: [
      rel(null, false, "Introduced via Brady Deaton as part of the widening financial interest in Pleet's work (BancFirst).", ["n-brady-deaton"], ["Brady Deaton", "BancFirst"]),
    ],
  },
  "n-gene-bulmash": {
    name: "Gene Bulmash",
    role: "City of Tulsa (Housing / Community Builder Program)",
    initialAppearanceDate: "2026-06-08",
    threads: ["strategic_relationships"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-06-08", false, "Fox 23 segment aired on the Mayor's housing initiative (13,000 properties in disrepair); Brady Deaton reached out and Gene Bulmash called him directly.", ["n-brady-deaton"], ["Brady Deaton", "City of Tulsa housing program"]),
      rel(null, true, "Facilitated the 23 June 2026 meeting between the Pleet team and Mayor Monroe Nichols.", ["n-mayor-meeting", "n-mayor-nichols"], ["Meeting with Mayor Monroe Nichols", "Mayor Monroe Nichols"]),
      rel(null, false, "Earlier involvement in the Oswego Project approval process.", ["n-oswego-approval"], ["Oswego Project — Tulsa City Council final approval"]),
    ],
  },
  "n-paul-lawson": {
    name: "Paul Lawson",
    role: "Co-Founder & CEO, White Wolf Creative (Tulsa, OK)",
    initialAppearanceDate: "2026-04-23",
    threads: ["media_brand", "strategic_relationships"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-04-23", false, "Introduced to Lawrence Gene by Brady Deaton.", ["n-whitewolf-intro", "n-brady-deaton"], ["Brady introduces White Wolf Creative", "Brady Deaton"]),
      rel("2026-06-05", false, "First meeting with White Wolf Creative (Paul Lawson and Mark) with Christy Price, Brady Deaton, and LG.", ["n-whitewolf-first-meeting", "n-christy-price", "n-brady-deaton"], ["First White Wolf Creative meeting", "Christy Price", "Brady Deaton"]),
      rel("2026-06-15", false, "Expanded strategy meeting incl. Amy Addington Smith re Pleet TV pilot & sponsors.", ["n-strategy-meeting-pleet-tv", "n-pleet-tv", "n-amy-addington-smith"], ["Strategy meeting — Pleet TV pilot episode & sponsors", "\"Pleet TV\"", "Amy Addington Smith"]),
      rel("2026-06-23", true, "Scheduled to attend meeting with Mayor Monroe Nichols.", ["n-mayor-meeting", "n-mayor-nichols"], ["Meeting with Mayor Monroe Nichols", "Mayor Monroe Nichols"]),
    ],
  },
  "n-nick-bright": {
    name: "Nick Bright",
    role: "Co-Owner, White Wolf Creative (Tulsa, OK)",
    initialAppearanceDate: "2026-04-23",
    threads: ["media_brand"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-04-23", false, "Co-owner of White Wolf Creative; introduced to Lawrence Gene alongside Paul Lawson.", ["n-whitewolf-intro", "n-paul-lawson"], ["Brady introduces White Wolf Creative", "Paul Lawson"]),
      rel(null, false, "Participated in early discussions on the Pleet TV concept (within the White Wolf Creative group).", ["n-pleet-tv", "n-whitewolf-first-meeting"], ["\"Pleet TV\"", "First White Wolf Creative meeting"]),
    ],
  },
  "n-tim-counsel": {
    name: "Timothy C. Janak, Esq.",
    role: "General Counsel, Pleet LLC; owner of the Oswego Project property",
    initialAppearanceDate: null,
    threads: ["major_projects", "strategic_relationships"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel(null, false, "Owner of the Oswego Street property — the first Pleet printing job in Tulsa.", ["n-oswego-printing", "n-oswego-approval"], ["Oswego Project — printing begins", "Oswego Project — Tulsa City Council final approval"]),
      rel("2026-06-22", true, "Scheduled to attend the ribbon-cutting ceremony with Mayor Monroe Nichols.", ["n-mayor-nichols", "n-oswego-printing"], ["Mayor Monroe Nichols", "Oswego ribbon cutting"]),
      rel("2026-06-23", true, "Scheduled to attend meeting with Mayor Monroe Nichols at Tulsa City Hall.", ["n-mayor-meeting", "n-mayor-nichols"], ["Meeting with Mayor Monroe Nichols", "Mayor Monroe Nichols"]),
    ],
  },
  "n-joshua": {
    name: "Joshua Bowers",
    role: "Estimation, Lee Simon Design",
    initialAppearanceDate: "2026-06-15",
    threads: ["major_projects", "strategic_relationships"],
    modalGraphic: null,
    note: null,
    relationships: [
      rel("2026-06-15", false, "Copied on Nick Denison's email to Kayla Lee re Clear Creek Butterfly pricing.", ["n-clear-creek-butterfly", "n-nick-denison", "n-kayla-lee"], ["Clear Creek Butterfly", "Nick Denison", "Kayla Lee"]),
      rel("2026-06-23", true, "Scheduled to attend meeting with Mayor Monroe Nichols at Tulsa City Hall.", ["n-mayor-meeting", "n-mayor-nichols"], ["Meeting with Mayor Monroe Nichols", "Mayor Monroe Nichols"]),
    ],
  },
  "n-bo-jett": {
    name: "Bo Jett",
    role: "Senior VP, Commercial Lending, IBC Bank — lender financing Brady Deaton's home",
    initialAppearanceDate: "2026-04-23",
    threads: ["financial_interest"],
    modalGraphic: null,
    note: BANK_NOTE,
    relationships: [
      rel("2026-04-23", false, "Introduced to Lawrence Gene by Brady Deaton at the \"Meet Bo & LG\" dinner.", ["n-meet-bo", "n-brady-deaton"], ["\"Meet Bo & LG\"", "Brady Deaton"]),
      rel("2026-06-11", false, "Attended \"Lunch with Bo\" with Brady Deaton, Lawrence Gene, and Kayla Lee.", ["n-lunch-with-bo", "n-brady-deaton", "n-kayla-lee"], ["\"Lunch with Bo\"", "Brady Deaton", "Kayla Lee"]),
      rel(null, false, "Financing Brady Deaton's home (IBC Bank).", ["n-brady-home"], ["Brady Deaton's Home — Sand Springs"]),
    ],
  },
  "n-hayden-hanoch": {
    name: "Hayden Hanoch",
    role: "VP of Commercial Banking, Gateway First Bank",
    initialAppearanceDate: "2026-06-25",
    threads: ["financial_interest"],
    modalGraphic: null,
    note: BANK_NOTE,
    relationships: [
      rel("2026-06-25", true, "Scheduled \"Meeting with Gateway\" at Colab Coffee with Brady Deaton and Lawrence Gene.", ["n-meeting-gateway", "n-brady-deaton"], ["\"Meeting with Gateway\"", "Brady Deaton"]),
    ],
  },
};

// ── Two NET-NEW person nodes (additive) ──────────────────────────────────────
const newNodes = [
  {
    id: "n-tony-winters",
    type: "person",
    title: "Tony Winters — ORU (housing development)",
    date: null,
    dateStart: null,
    dateEnd: null,
    thread: "growth",
    summary: "ORU contact exploring a Muskogee housing development with Pleet LLC.",
    bodyMd: "**Tony Winters** — affiliated with **ORU**, interested in developing housing. Met with Brady Deaton and Lawrence Gene on 9 Apr 2026 regarding the Muskogee housing development project. (Source: Master Person–Relationship Index v1.0; no independent public source yet — §12.)",
    demandScore: null,
    media: [],
    citationIds: [],
    confidence: "unconfirmed",
    person: {
      name: "Tony Winters",
      role: "ORU — interested in developing housing",
      initialAppearanceDate: "2026-04-09",
      threads: ["growth"],
      modalGraphic: null,
      note: null,
      relationships: [
        rel("2026-04-09", false, "Met with Brady Deaton and Lawrence Gene regarding the Muskogee housing development project.", ["n-brady-deaton"], ["Brady Deaton", "Muskogee project"]),
      ],
    },
  },
  {
    id: "n-christy-price",
    type: "person",
    title: "Christy Price — Supporting participant",
    date: null,
    dateStart: null,
    dateEnd: null,
    thread: "strategic_relationships",
    summary: "Supporting participant across the Savanna Schools and White Wolf / Pleet TV threads.",
    bodyMd: "**Christy Price** — a supporting participant often present with Lawrence Gene. Lighter-detail entry per the Master Person–Relationship Index v1.0: present at the 22 May Savanna Schools meeting, the 5 June first White Wolf Creative meeting, and the 15 June Pleet TV strategy meeting. (Source: Master Person–Relationship Index v1.0 — §12.)",
    demandScore: null,
    media: [],
    citationIds: [],
    confidence: "unconfirmed",
    person: {
      name: "Christy Price",
      role: "Supporting participant (often present with Lawrence Gene)",
      initialAppearanceDate: "2026-05-22",
      threads: ["savanna", "media_brand"],
      modalGraphic: null,
      note: null,
      relationships: [
        rel("2026-05-22", false, "Attended meeting with Adam Newman, Brady Deaton, and Lawrence Gene.", ["n-adam-newman", "n-brady-deaton"], ["Adam Newman", "Brady Deaton", "Savanna Schools introduction"]),
        rel("2026-06-05", false, "Attended the first White Wolf Creative meeting with Paul Lawson, Mark, Brady Deaton, and Lawrence Gene.", ["n-whitewolf-first-meeting", "n-paul-lawson"], ["First White Wolf Creative meeting", "Paul Lawson"]),
        rel("2026-06-15", false, "Participated in the Pleet TV strategy meeting with White Wolf Creative, Amy Addington Smith, Brady Deaton, and Lawrence Gene.", ["n-strategy-meeting-pleet-tv", "n-pleet-tv", "n-amy-addington-smith"], ["Strategy meeting — Pleet TV pilot episode & sponsors", "\"Pleet TV\"", "Amy Addington Smith"]),
      ],
    },
  },
];

const YOPTS = { lineWidth: 0 };
const indent = (s, n) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

// Insert a `person:` block as the last field of each existing person node.
for (const [id, profile] of Object.entries(profiles)) {
  const startMarker = `  - id: ${id}\n`;
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`node not found: ${id}`);
  // Boundary = next top-level node, or end of file.
  const next = text.indexOf("\n  - id: ", start + startMarker.length);
  const boundary = next < 0 ? text.length : next + 1; // keep the leading \n with the next node
  const block = indent(stringify({ person: profile }, YOPTS), 4);
  text = text.slice(0, boundary) + block + text.slice(boundary);
}

// Append the two new nodes at EOF (as list items under `nodes:`).
if (!text.endsWith("\n")) text += "\n";
for (const node of newNodes) {
  const yamlItem = indent(stringify([node], YOPTS), 2); // `- id:` → `  - id:`
  text += yamlItem;
}

writeFileSync(FILE, text);
console.log("nodes.yaml enriched: 15 profiles + 2 new nodes.");
