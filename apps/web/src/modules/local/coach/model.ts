/**
 * The two local models offered on the page. Both are Qwen3 (Apache-2.0): the official Qwen3
 * announcement lists Czech among its 119 languages, and the same family in two sizes lets the
 * visitor see what size alone changes. Everything is pinned: weights to a Hugging Face commit,
 * the compiled WebGPU library to a commit of mlc-ai/binary-mlc-llm-libs.
 *
 * Considered and rejected (state 2026-11-24, WebLLM 0.2.89 prebuilt list):
 * - Phi-4-mini-instruct names Czech, but downloads 2.18 GB and needs ~3.4 GB of VRAM.
 * - gemma-4-E2B-it downloads 2.83 GB.
 * - Qwen3.5 (0.8B/2B) is newer and claims 201 languages, but does not name Czech (OQ-27).
 * - Llama 3.2 and SmolLM3 do not list Czech among supported languages.
 */

export const WEBLLM_VERSION = '0.2.89';
export const MODEL_LIB_COMMIT = '5b7251f3bdce957be2a7bf73a6f6c560d9874df4';
const MODEL_LIB_BASE = `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/${MODEL_LIB_COMMIT}/web-llm-models/v0_2_87/base/`;

export const MODEL_SOURCES = {
  retrievedAt: '2026-11-24',
  sizes: 'https://huggingface.co/api/models/mlc-ai',
  languages: 'https://qwenlm.github.io/blog/qwen3/',
  licence: 'Apache-2.0',
} as const;

export type CoachModelKey = 'small' | 'large';
/** q4f16_1 needs the WebGPU feature `shader-f16`; q4f32_1 runs everywhere, with more memory. */
export type Precision = 'f16' | 'f32';

export interface ModelVariant {
  modelId: string;
  hfRevision: string;
  /** Sum of all files in the Hugging Face repo at that revision. */
  weightsBytes: number;
  libFile: string;
  libBytes: number;
  vramMB: number;
}

export interface CoachModel {
  key: CoachModelKey;
  name: string;
  hfBase: string;
  variants: Record<Precision, ModelVariant>;
}

export const COACH_MODELS: Record<CoachModelKey, CoachModel> = {
  small: {
    key: 'small',
    name: 'Qwen3-0.6B',
    hfBase: 'https://huggingface.co/Qwen/Qwen3-0.6B',
    variants: {
      f16: {
        modelId: 'Qwen3-0.6B-q4f16_1-MLC',
        hfRevision: '8c14ce481d4c692769976ad52afea453a102df19',
        weightsBytes: 351_517_143,
        libFile: 'Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm',
        libBytes: 6_561_594,
        vramMB: 1403.34,
      },
      f32: {
        modelId: 'Qwen3-0.6B-q4f32_1-MLC',
        hfRevision: '9b4f0b05b08c692ea86fe151ea878406ad22f428',
        weightsBytes: 351_644_955,
        libFile: 'Qwen3-0.6B-q4f32_1_cs1k-webgpu.wasm',
        libBytes: 6_440_711,
        vramMB: 1924.98,
      },
    },
  },
  large: {
    key: 'large',
    name: 'Qwen3-1.7B',
    hfBase: 'https://huggingface.co/Qwen/Qwen3-1.7B',
    variants: {
      f16: {
        modelId: 'Qwen3-1.7B-q4f16_1-MLC',
        hfRevision: '80b3abcec6c3b3f5355dc0cc99cc4fb578f192bc',
        weightsBytes: 984_156_278,
        libFile: 'Qwen3-1.7B-q4f16_1_cs1k-webgpu.wasm',
        libBytes: 6_589_747,
        vramMB: 2036.66,
      },
      f32: {
        modelId: 'Qwen3-1.7B-q4f32_1-MLC',
        hfRevision: 'bddd4d584cabe19113f7e4ff46fd9e73b4d3dc89',
        weightsBytes: 984_289_034,
        libFile: 'Qwen3-1.7B-q4f32_1_cs1k-webgpu.wasm',
        libBytes: 6_467_624,
        vramMB: 2635.44,
      },
    },
  },
};

/** The page is mostly used on notebooks and school PCs, so the better model is the default. */
export const DEFAULT_MODEL: CoachModelKey = 'large';
export const CONTEXT_WINDOW = 4096;

export const downloadBytes = (v: ModelVariant) => v.weightsBytes + v.libBytes;
export const modelUrl = (v: ModelVariant) =>
  `https://huggingface.co/mlc-ai/${v.modelId}/resolve/${v.hfRevision}/`;

/** A WebLLM `ModelRecord` for the variant (only the fields WebLLM needs). */
export function modelRecord(v: ModelVariant) {
  return {
    model: modelUrl(v),
    model_id: v.modelId,
    model_lib: MODEL_LIB_BASE + v.libFile,
    vram_required_MB: v.vramMB,
    low_resource_required: true,
    overrides: { context_window_size: CONTEXT_WINDOW },
  };
}

/** WebLLM `AppConfig` with only our four records (a custom list replaces the prebuilt one). */
export function appConfig() {
  return {
    model_list: Object.values(COACH_MODELS).flatMap((m) =>
      Object.values(m.variants).map(modelRecord),
    ),
    cacheBackend: 'cache' as const,
  };
}

/**
 * Hosts the model download comes from: Hugging Face (it redirects to its CDN on *.hf.co) and
 * GitHub for the compiled library. Used to tell the download apart on the network panel.
 */
export function isModelHost(host: string): boolean {
  return (
    host === 'huggingface.co' ||
    host.endsWith('.huggingface.co') ||
    host.endsWith('.hf.co') ||
    host === 'raw.githubusercontent.com'
  );
}
