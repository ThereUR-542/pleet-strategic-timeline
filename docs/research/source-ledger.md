# Pleet Strategic Timeline — Source Ledger (Research Lead)

**Owner:** Research Lead · **Updated:** 2026-06-18 · **Standard:** every researchable claim carries ≥1 verifiable source; material claims carry **two independent** sources. Lawrence's own notes and the PRD are primary sources and are not subject to the double-sourcing rule, but where independent research **contradicts** a primary-source claim that contradiction is flagged for the board.

> **Intake integration ([PLE-113](/PLE/issues/PLE-113)).** This ledger is the verification standard the supplementary-document intake consumes (`document-intake/`). When a board doc resolves an item below, its intake record names the item in `resolvesLedger:` and updates this file in the same change: **§C/§D items are the closeable targets** (open gaps and discrepancies). Resolved §D items move to §A (double-sourced) or §B (primary-only); resolved §C discrepancies are annotated RESOLVED with the `DOC-NNN` id and the board's decision — discrepancy history is never deleted.

Status legend: **VERIFIED** (≥2 independent reputable sources) · **PARTIAL** (some elements verified, others not) · **PRIMARY-ONLY** (rests on Lawrence's notes/calendar/business cards — not independently double-sourceable, which is expected) · **UNVERIFIED** (could not be double-sourced) · **DISCREPANCY** (independent research contradicts the current build content).

---

## A. CONFIRMED — public, double-sourced

### A1. Mayor Monroe Nichols — VERIFIED (closes a §12 gap)
- **Official title / name:** **Monroe Nichols IV**, the **41st Mayor of Tulsa, Oklahoma**. Tulsa's **first Black/African American mayor**.
- **Term:** Elected 6 Nov 2024 (defeated Karen Keith); **sworn in 2 Dec 2024**; four-year term.
- **Office:** Tulsa City Hall, **One Technology Center, 175 E. 2nd St, Tulsa, OK 74103** (Mayor's office, 15th floor).
- Sources (independent):
  - "Tulsa Welcomes New Mayor, Auditor, City Councilors to City Hall." *City of Tulsa*, 2 Dec. 2024, cityoftulsa.org/press-room/tulsa-welcomes-new-mayor-auditor-city-councilors-to-city-hall-dec-2024/.
  - "Tulsa Elects First Black Mayor." *PBS NewsHour*, NewsHour Productions, Nov. 2024, pbs.org/newshour/live-update/election-news-2024/tulsa-elects-first-black-mayor.
  - Corroboration: FOX23, "Monroe Nichols sworn in as Tulsa's 41st mayor," 2 Dec. 2024.
- **Action for Content:** update `n-mayor-nichols` body to "Mayor Monroe Nichols IV — 41st Mayor of Tulsa (took office Dec 2, 2024)"; flip confidence `unconfirmed → confirmed`; remove "Official title pending verification (§12)."

### A2. Tulsa Airports Improvement Trust (TAIT) + Daniel Regan — VERIFIED (strengthens the manufacturing thesis)
- **TAIT** is the real public trust (est. 1967) that operates **Tulsa International Airport (TUL)** and Tulsa Riverside Airport, on behalf of the City of Tulsa.
- **Daniel Regan** is publicly named as **Director of Real Estate and Business Development, TAIT** — confirmed by the airport's own newsroom (first-party).
- **Manufacturing context (corroborates §5.3 Oklahoma imperative):** TAIT markets **1,200+ acres** of developable land; landed **NorSun's $620M solar-wafer plant** (60-acre shovel-ready site, 2024); hosts American Airlines Tech Ops (world's largest airline maintenance base) and Spirit AeroSystems. A real, documented manufacturing-siting precedent.
- Sources:
  - "Tulsa International Airport and TNP Fuels Break Ground…" *Fly Tulsa (TAIT)*, 3 Apr. 2025 — names Regan with exact title.
  - "NorSun Announces $620 Million Investment…at Tulsa International Airport." *State of Oklahoma — Aerospace Newsroom*, 2 July 2024.
- **Action for Content:** `n-daniel-regan` already `confirmed` — OK. Optionally cite the NorSun precedent in `n-oklahoma-manufacturing` as an independent siting analogue.

### A3. Financing institutions (IBC, Gateway First, BancFirst) — VERIFIED
- **IBC Bank** (International Bancshares) operates in Oklahoma; obtained OK charter 2023; **3817 NW Expressway #100, OKC 73112** is a real IBC branch.
- **Gateway First Bank** — Oklahoma banking corp **headquartered in Jenks, OK** (formed 6 May 2019 from Gateway Mortgage + Farmers Exchange Bank).
- **BancFirst** — Oklahoma bank (HQ OKC); **Jenks branch, 200 E Main St, Jenks, OK 74037** (FDIC Cert #27476).
- Sources: IBC official branch page + *Southwest Ledger* (30 Jan 2023); Gateway First newsroom (6 May 2019) + *National Mortgage Professional*; *USBankLocations* (FDIC data) + FFIEC NPW profile.

### A4. Architecture / media firms — VERIFIED
- **1Architecture LLC** (stylized one word), Tulsa, founded 2005; **1319 E 6th St, Tulsa OK 74120**; (918) 764-9996. **Nick Denison** = Principal/Owner; co-owners **Kevin Hale** and **Melissa Lynn** (a Cherokee Nation citizen). Registered **Cherokee TERO vendor**. *(Sources: 1architecture.com/our-team; Yelp; Cherokee TERO directory.)*
- **Lee Simon Design (+ Construction)**, Tulsa, founded 2020; **616 S Main St #112, Tulsa OK 74119**; **Kayla Lee, NCARB** = Founder + Architect. *(Sources: leesimondesign.co/studio; LinkedIn.)*
- **White Wolf Creative** (whitewolfcreative.tv), Tulsa video/creative studio; **Paul Lawson** (Co-Founder & CEO) and **Nick Bright** (Co-founder) confirmed. *(Sources: whitewolfcreative.tv/about; Nick Bright LinkedIn.)* Street address should be re-checked against current site.
- **Tulsa Home & Garden Show 2026:** **March 5–8, 2026**, SageNet Center, Expo Square. *(Sources: tulsahba.com; ExpoSquare.com.)* — confirms `n-tulsa-home-garden-show` dates.

### A5. SQ4D — company & milestone VERIFIED (but see DISCREPANCY C1)
- SQ4D is a real, credible 3D-printed-construction company: listed the **first permitted 3D-printed house for sale in the U.S.** (Riverhead, NY, Jan 2021) printed with its **ARCS** (Autonomous Robotic Construction System); first U.S. 3D-printed residence to receive a certificate of occupancy. *(Sources: PR Newswire, 26 Jan 2021; 3Dnatives, 1 Feb 2021; Greater Long Island, 3 Feb 2021.)*

---

## B. PRIMARY-SOURCE-ONLY — confirmed by Lawrence's notes/cards; not independently double-sourceable (expected)

These rest on Lawrence's calendar invites, emails, and business cards (primary sources per the board rule). Independent corroboration is not required, and absence of a public second source is **not** a defect.

- **Bo Jett** — Sr. VP, Commercial Lending, IBC Bank. Build has a **business card** asset (`bo-jett-card.png`) = a primary source. *Public double-sourcing: UNVERIFIED (only self/employer sources found) — acceptable on primary-source basis; do not assert public corroboration.*
- **Amy K. Cook** — EVP, BancFirst Jenks. *Public double-sourcing: UNVERIFIED (data-aggregators only). Primary-source/Lawrence-confirmed; keep as `confirmed` on that basis, not on public corroboration.*
- **Hayden Hanoch** — Gateway First Bank. **Bonus: publicly double-sourceable** — FOX23 (20 May 2026) names him as a Gateway First Bank VP (Commercial Banking) with a direct quote, + LinkedIn. Build can flip `n-hayden-hanoch` toward `confirmed` and add a title ("VP, Commercial Banking").
- All calendar-driven event nodes (Lunch with Pleet, Meet Bo, Lunch with Bo, Meeting with Gateway, Mayor meeting roster, etc.) — PRIMARY-ONLY via Brady Deaton's invites (cited in `CITATIONS`). Correct as-is.

---

## C. DISCREPANCIES — independent research contradicts current build content (ROUTE TO BOARD)

### C1. SQ4D contact + address — DISCREPANCY (material)
Current build (`n-aiman-hussain`, `n-sq4d-contact`) asserts **"Aiman Hussein — VP of Operations, SQ4D LLC, 400 David Court, Calverton, NY 11933"** and marks the person node `confirmed`.
- **Address is wrong:** independent sources place SQ4D's HQ in **Patchogue, NY** (West Main St). **400 David Court, Calverton, NY 11933 is "Skydive Long Island"** (a skydiving operation at Calverton Airport) — not SQ4D.
- **Contact unverifiable / likely misattributed:** no public source ties **Aiman Hussein** to SQ4D. Aiman Hussein is publicly associated with **Alquist 3D** (a *different* 3D-construction firm), as VP of Technology. SQ4D's publicly documented operations lead is **Kirk Andersen, Director of Operations**.
- **Entity form:** public filings show "SQ4D **Inc.**"; build says "SQ4D **LLC**."
- **Note:** the SQ4D relationship is itself flagged in the PRD as **intentionally TBD / aspirational**, so this may originate from an early/unconfirmed contact in Lawrence's notes. **Do not silently overwrite** — but the address and the `confirmed` flag on the contact should not stand.
- **Question for Lawrence (board):** Is the SQ4D contact actually Aiman Hussein, or Kirk Andersen? What is the correct SQ4D address? Is the entity "SQ4D Inc." or "SQ4D LLC"? Until answered, recommend `n-aiman-hussain`/`n-sq4d-contact` → `unconfirmed`, drop the Calverton address.

### C2. Cherokee Nation "$40M contract" — DISCREPANCY / RESOLVED as conflation
Current build (`n-cherokee-nation-housing`) says **"1 Architecture has a reported $40M contract with the Cherokee Nation (figure to be verified, §12)."**
- **Finding:** No public record ties 1Architecture to a $40M Cherokee Nation contract. The **$40 million figure is the Cherokee Nation's tribe-wide _Housing, Jobs and Sustainable Communities Act_** — **$40M every three years in perpetuity** (85% housing / 15% community buildings) — **not** a 1Architecture contract. *(Sources: Anadisgoi / Cherokee Nation; Cherokee Phoenix, 2024.)*
- 1Architecture's genuine Cherokee links: co-owner Melissa Lynn is a Cherokee citizen; firm is a Cherokee TERO vendor. Neither is a $40M contract.
- **Action for Content:** rewrite to avoid asserting a $40M 1Architecture contract; either drop the figure or reframe as "Cherokee Nation housing program ($40M/3-yr Housing Act) is the broader opportunity context." Keep `unconfirmed`.

### C3. Minor — 1Architecture ownership
Build calls Nick Denison "Principal & Owner." Public source shows **co-ownership** (Denison + Kevin Hale + Melissa Lynn). Low-priority wording fix.

---

## D. STILL OPEN — primary-source-only gaps for Lawrence (cannot be researched; route up)

These are inherently private and must come from Lawrence (Rule #1: not for a human only if an agent *could* do it — these genuinely require Lawrence's primary documents):
- **Adam Newman** — full name/spelling (Savanna Schools introducer).
- **Gene Bulmash** — full name/spelling + City of Tulsa Housing title.
- **Savanna Schools** — official district identity/location (no public match yet; confirm exact name).
- **Cherokee $40M** — see C2; confirm intended meaning.
- **Revenue Maximization Model** — full document (§8.1 BLOCKER).
- **City of Tulsa housing PDFs**, **Skyland 3D ROM worksheet**, **Legacy Farms / Spoke House** specifics — primary documents pending.
- **Mayor-meeting roster** (Jun 23) — confirm attendees.

---

## E. Citation backfill candidates (MLA-9, for the `CITATIONS` array)
Public, verifiable sources now available to attach to nodes:
- Mayor node → City of Tulsa press release + PBS NewsHour (A1).
- Oklahoma manufacturing node → State of Oklahoma NorSun release + Fly Tulsa newsroom (A2).
- Tulsa Home & Garden Show node → tulsahba.com + ExpoSquare (A4).
- SQ4D milestone → PR Newswire + 3Dnatives (A5).
- Cherokee context → Anadisgoi + Cherokee Phoenix (C2).
- Hayden Hanoch → FOX23 (B).
