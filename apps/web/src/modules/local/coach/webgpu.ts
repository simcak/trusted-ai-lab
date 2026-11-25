/** Minimal WebGPU shapes; the full types would be a dependency just for two calls. */
interface GpuAdapterLike {
  features: { has(feature: string): boolean };
  info?: { vendor?: string; architecture?: string; description?: string };
}
interface GpuLike {
  requestAdapter(options?: {
    powerPreference?: 'high-performance';
  }): Promise<GpuAdapterLike | null>;
}

export type GpuStatus =
  | { status: 'unsupported'; reason: 'no_api' | 'no_adapter' }
  | { status: 'ok'; shaderF16: boolean; label: string | undefined };

/** Checks WebGPU without loading WebLLM: is there an adapter, and can it do f16 shaders? */
export async function detectWebGpu(nav: Navigator = navigator): Promise<GpuStatus> {
  const gpu = (nav as Navigator & { gpu?: GpuLike }).gpu;
  if (!gpu) return { status: 'unsupported', reason: 'no_api' };
  const adapter = await gpu
    .requestAdapter({ powerPreference: 'high-performance' })
    .catch(() => null);
  if (!adapter) return { status: 'unsupported', reason: 'no_adapter' };
  const info = adapter.info;
  const label =
    [info?.vendor, info?.architecture].filter(Boolean).join(' · ') ||
    info?.description ||
    undefined;
  return { status: 'ok', shaderF16: adapter.features.has('shader-f16'), label };
}
