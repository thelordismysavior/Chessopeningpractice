# LINE/64 is the visual contract

The curated LINE/64 export is the binding visual contract for every production surface, not a
source of loose inspiration. Its design documents, tokens, screen HTML, applied UI kit, icon
sources, and approved previews are versioned as durable evidence and visual-regression baselines;
production may substitute real data and behavior for prototype placeholders, but must preserve the
exported visual system, responsive composition, interaction semantics, and accessibility.

## Consequences

Implementation work must compare production against the reference across the documented viewport
matrix. Superseded visual rules and invented branding are removed rather than hidden beneath more
CSS overrides, while production-only states use the same LINE/64 tokens and components.
Visual baselines may change only with an intentional update to the tracked reference or explicit
design approval; regenerating baselines from a drifting production implementation is not approval.
