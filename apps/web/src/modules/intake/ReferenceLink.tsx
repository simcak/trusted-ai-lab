import type { Reference } from '@trusted-ai-lab/intake-rules';

export function ReferenceLink({ reference }: { reference: Reference }) {
  return reference.url ? (
    <a href={reference.url} rel="noreferrer">
      {reference.label}
    </a>
  ) : (
    <span>{reference.label}</span>
  );
}
