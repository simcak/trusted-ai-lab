/**
 * The optional NER model — one definition shared by the eval script (Node) and the web page
 * (browser), so both run exactly the same model revision with the same options.
 *
 * Model: https://huggingface.co/onnx-community/small-e-czech-finetuned-ner-wikiann-ONNX
 * (ONNX conversion of richielo/small-e-czech-finetuned-ner-wikiann, CC BY 4.0; base model
 * Seznam/small-e-czech, CC BY 4.0). Sizes from the Hugging Face API, revision below.
 */
export const NER_MODEL = {
  id: 'onnx-community/small-e-czech-finetuned-ner-wikiann-ONNX',
  /** Pinned commit of the model repository (lastModified 2025-09-01). */
  revision: '0c3c43a6451bd12d65bf429ffefc9f7948085a36',
  /** `q8` = onnx/model_quantized.onnx */
  dtype: 'q8',
  /** Bytes of the files the pipeline downloads (model_quantized.onnx + tokenizer + configs). */
  downloadBytes: 14_159_685 + 714_479 + 1_139 + 1_297,
  modelCard: 'https://huggingface.co/onnx-community/small-e-czech-finetuned-ner-wikiann-ONNX',
  upstream: 'https://huggingface.co/richielo/small-e-czech-finetuned-ner-wikiann',
  baseModel: 'https://huggingface.co/Seznam/small-e-czech',
  licence: 'CC BY 4.0 (upstream model and base model)',
  /** Options passed to createNerDetector() — identical in the eval and in the browser. */
  detector: { minTokenScore: 0.5, weight: 0.8 },
} as const;
