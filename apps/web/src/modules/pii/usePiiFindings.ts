import { detect, mergeFindings, type AsyncDetector, type Finding } from '@trusted-ai-lab/pii-cz';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

interface PluginResult {
  text: string;
  findings: Finding[];
}

/**
 * Rule findings are synchronous (computed for the deferred text); the optional NER plugin runs
 * asynchronously and is merged in once its result belongs to the current text.
 */
export function usePiiFindings(text: string, plugin: AsyncDetector | undefined) {
  const deferredText = useDeferredValue(text);
  const ruleFindings = useMemo(() => detect(deferredText), [deferredText]);
  const [pluginResult, setPluginResult] = useState<PluginResult | null>(null);
  const [pluginError, setPluginError] = useState(false);

  useEffect(() => {
    if (!plugin) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      plugin(deferredText).then(
        (findings) => {
          if (!cancelled) setPluginResult({ text: deferredText, findings });
        },
        () => {
          if (!cancelled) setPluginError(true);
        },
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deferredText, plugin]);

  const pluginReady = plugin !== undefined && pluginResult?.text === deferredText;
  const findings = useMemo(
    () => (pluginReady ? mergeFindings(ruleFindings, pluginResult.findings) : ruleFindings),
    [pluginReady, pluginResult, ruleFindings],
  );

  return {
    text: deferredText,
    findings,
    pluginPending: plugin !== undefined && !pluginReady && !pluginError,
    pluginError,
  };
}
