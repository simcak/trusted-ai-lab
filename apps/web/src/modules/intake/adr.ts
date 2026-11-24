import {
  AI_ACT_STATUS,
  FACT_FIELDS,
  getMilestone,
  getRule,
  type CostEstimate,
  type IntakeInput,
  type IntakeResult,
  type Pricing,
  type Range,
  type RuleId,
} from '@trusted-ai-lab/intake-rules';
import { cs } from '../../i18n/cs.ts';
import { formatDay, formatInt, formatUsd } from './format.ts';
import { factLabel, patternHeadline, patternSummary } from './labels.ts';

const t = cs.intake;

export interface AdrData {
  name: string;
  input: IntakeInput;
  result: IntakeResult;
  cost: CostEstimate;
  pricing: Pricing;
  /** Export date (ISO); also decides whether an AI Act milestone already applies. */
  date: string;
}

export const formatRange = (r: Range) => t.cost.range(formatUsd(r.min), formatUsd(r.max));

/** Rules that put a human in the loop. */
export function humanRules(result: IntakeResult): RuleId[] {
  return result.fired.filter((id) => id.startsWith('hitl.') || id === 'pattern.no-candidate');
}

/** ADR title: the preset name, else the first line of the description. */
export function adrName(description: string, presetLabel: string | null): string {
  if (presetLabel) return presetLabel;
  const first = description.trim().split(/\r?\n/)[0]?.trim() ?? '';
  if (!first) return t.adr.untitled;
  return first.length <= 80 ? first : `${first.slice(0, 80).replace(/\s+\S*$/, '')}…`;
}

export function adrFileName(name: string, date: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return `adr-${slug || 'zamer'}-${date}.md`;
}

/** Text safe inside a Markdown table cell. */
export function cell(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\s*\r?\n\s*/g, ' ');
}

function link(label: string, url: string | undefined): string {
  return url ? `[${label}](${url})` : label;
}

const code = (ids: readonly string[]) => ids.map((id) => `\`${id}\``).join(', ');

export function toAdrMarkdown({ name, input, result, cost, pricing, date }: AdrData): string {
  const a = t.adr;
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push(`# ${a.title(name)}`, '');
  push(`- ${a.status}: ${a.statusValue}`);
  push(`- ${a.date}: ${date}`);
  push(`- ${a.decision}: ${patternHeadline(result)}`, '');

  push(`## ${a.context}`, '');
  const description = input.description.trim();
  push(
    description
      ? description
          .split(/\r?\n/)
          .map((l) => `> ${l}`.trimEnd())
          .join('\n')
      : a.noDescription,
  );
  push('', `| ${a.parameter} | ${a.value} |`, '| --- | --- |');
  for (const field of FACT_FIELDS) {
    push(`| ${cell(t.fields[field].legend)} | ${cell(factLabel(field, input[field]))} |`);
  }
  push('');

  push(`## ${a.decision}`, '');
  push(`${a.chosen}: **${patternHeadline(result)}**`, '', patternSummary(result), '');
  const human = humanRules(result);
  if (human.length > 0) {
    push(`**${t.humanWhy}:**`, '');
    for (const id of human) push(`- ${getRule(id).rationale} (${code([id])})`);
    push('');
  }

  push(`## ${a.alternatives}`, '');
  if (result.blocked) {
    push(`- ${t.rejected.allBlocked} ${getRule('pattern.prohibited-practice').rationale}`);
  } else {
    for (const r of result.rejected) {
      const [first] = r.ruleIds;
      const why = first ? getRule(first).rationale : '';
      push(
        `- **${t.patterns[r.pattern].label}**: ${a.rejectedBecause}. ${why} (${code(r.ruleIds)})`,
      );
    }
  }
  push('');

  push(`## ${a.consequences}`, '', `### ${a.controls}`, '');
  if (result.controls.length === 0) push(`- ${t.data.none}`);
  for (const c of result.controls) push(`- ${t.data.controls[c.control]} (${code(c.ruleIds)})`);
  push('');

  push(`### ${a.aiAct(formatDay(AI_ACT_STATUS.asOf))}`, '');
  push(`- ${a.category}: **${t.aiAct.categories[result.aiAct.category]}**`);
  for (const f of result.aiAct.findings) {
    const rule = getRule(f.ruleId);
    const milestone = getMilestone(f.appliesFrom);
    const applies = t.aiAct.appliesFrom(formatDay(milestone.date), milestone.date <= date);
    push(
      `- ${link(rule.reference.label, rule.reference.url)}: ${applies} (${milestone.provision}). ${rule.rationale} (${code([f.ruleId])})`,
    );
  }
  push(`- ${t.aiAct.amendedBy}`);
  push(
    `- ${a.sources}: ${[AI_ACT_STATUS.regulation, AI_ACT_STATUS.amendment, ...AI_ACT_STATUS.sources]
      .map((s) => link(s.label, s.url))
      .join('; ')}`,
    '',
  );

  push(`### ${a.cost}`, '');
  if (cost.kind === 'estimate') {
    push(`| ${a.tier} | ${t.cost.perMonth} | ${a.models} |`, '| --- | --- | --- |');
    for (const tier of cost.tiers) {
      const value = tier.monthlyUsd ? formatRange(tier.monthlyUsd) : t.cost.unverified;
      const models = tier.models.map((m) => m.model).join(', ') || '—';
      push(`| ${t.cost.tiers[tier.tier]} | ${value} | ${cell(models)} |`);
    }
    push('');
    push(
      t.cost.assumption(
        `${formatInt(cost.profile.input.min)}–${formatInt(cost.profile.input.max)}`,
        `${formatInt(cost.profile.output.min)}–${formatInt(cost.profile.output.max)}`,
      ),
    );
    if (cost.batch) push('', t.cost.batch);
    push('', `${t.cost.sources}:`, '');
    for (const p of pricing.providers) {
      const when = p.retrievedAt ? ` ${t.cost.retrievedAt(formatDay(p.retrievedAt))}` : '';
      push(`- ${link(p.name, p.source ?? undefined)}${when}`);
    }
  } else {
    push(cost.kind === 'no-tokens' ? t.cost.noTokens : t.cost.notTokenBased);
  }
  push('');

  push(
    `## ${a.rules}`,
    '',
    `| ${a.rule} | ${a.rationale} | ${a.reference} |`,
    '| --- | --- | --- |',
  );
  for (const id of result.fired) {
    const rule = getRule(id);
    push(
      `| \`${id}\` | ${cell(rule.rationale)} | ${cell(link(rule.reference.label, rule.reference.url))} |`,
    );
  }
  push('', '---', '', a.disclaimer, '');

  return lines.join('\n');
}
