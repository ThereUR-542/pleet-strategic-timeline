// =============================================================================
// Researched entity logos (PLE-92, v4). Board direction: "research things —
// real research." These are the real-world organizations behind the nodes, with
// domains confirmed by web research (June 2026). Each org's brand mark is
// vendored locally under /public/logos/<domain>.png (downloaded, not hotlinked
// — reliable and crisp for board/investor viewing). Nodes without a researched
// org fall back to a category icon (see flowIcons.tsx).
// =============================================================================

/** nodeId → primary organization domain. */
export const NODE_ORG_DOMAIN: Record<string, string> = {
  // SQ4D — 3D-printing construction tech (sq4d.com)
  "n-sq4d-contact": "sq4d.com",
  "n-aiman-hussain": "sq4d.com",
  // IBC Bank (ibc.com)
  "n-bo-jett": "ibc.com",
  "n-meet-bo": "ibc.com",
  "n-lunch-with-bo": "ibc.com",
  // Gateway First Bank, Jenks OK (gatewayfirst.com)
  "n-hayden-hanoch": "gatewayfirst.com",
  "n-meeting-gateway": "gatewayfirst.com",
  // BancFirst (bancfirst.bank)
  "n-amy-bancfirst": "bancfirst.bank",
  // City of Tulsa / Mayor's office (cityoftulsa.org)
  "n-mayor-nichols": "cityoftulsa.org",
  "n-mayor-meeting": "cityoftulsa.org",
  "n-oswego-approval": "cityoftulsa.org",
  "n-oswego-rezoning": "cityoftulsa.org",
  // Lee Simon Design + Construction (leesimondesign.co)
  "n-kayla-lee": "leesimondesign.co",
  "n-kayla-first-meeting": "leesimondesign.co",
  // Skyland 3D — Kaw Nation Industries (skyland3d.com)
  "n-skyland-rom": "skyland3d.com",
  // White Wolf Creative, Tulsa (whitewolfcreative.tv)
  "n-whitewolf-intro": "whitewolfcreative.tv",
  "n-whitewolf-first-meeting": "whitewolfcreative.tv",
  "n-paul-lawson": "whitewolfcreative.tv",
  "n-nick-bright": "whitewolfcreative.tv",
  "n-pleet-tv": "whitewolfcreative.tv",
  "n-strategy-meeting-pleet-tv": "whitewolfcreative.tv",
  // Cherokee Nation (cherokee.org)
  "n-cherokee-nation-housing": "cherokee.org",
  // Oklahoma State School Boards Association (ossba.org)
  "n-savanna-ossba": "ossba.org",
};

/** Locally vendored brand mark (see /public/logos). */
export function logoUrlForDomain(domain: string): string {
  return `/logos/${domain}.png`;
}

export function logoForNode(nodeId: string): string | null {
  const domain = NODE_ORG_DOMAIN[nodeId];
  return domain ? logoUrlForDomain(domain) : null;
}
