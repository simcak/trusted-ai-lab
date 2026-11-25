/**
 * The page shows the answer as plain text. Small models sometimes add Markdown or repeat the
 * input as a code block despite the prompt; this removes that for display only. The trace keeps
 * the model's raw output.
 */
export function plainAnswer(text: string): string {
  return text
    .replace(/```[\s\S]*?(```|$)/g, '') // code blocks, also an unfinished one while streaming
    .replace(/^\s{0,3}#{1,6}\s*/gm, '') // headings
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '') // list markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$|[.,;:!?])/g, '$1$2') // italics
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
