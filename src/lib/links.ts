/**
 * Returns anchor props that open safely in a new tab (§4.4/§11).
 * Prevents reverse-tabnabbing — use on EVERY external link site-wide.
 */
export function externalLinkProps(href: string) {
  return {
    href,
    target: "_blank" as const,
    rel: "noopener noreferrer",
  };
}
