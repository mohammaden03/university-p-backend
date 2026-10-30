import { Language } from '@prisma/client';

export interface RecognizeRequestPayload {
  pageId: string;
  imageStorageKey: string;
  language: Language;
  modelName?: string;
  processingOptions?: {
    binarizationMethod?: 'sauvola' | 'otsu' | 'wolf' | 'none';
    deskew?: boolean;
    contrastEnhancement?: boolean;
    scriptHint?: string;
    lineSegmentationMethod?: 'watershed' | 'craft' | 'yolo' | 'heuristic';
    beamWidth?: number;
    useLanguageModel?: boolean;
    [key: string]: any;
  };
}

export interface LineRegionData {
  lineNumber: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    polygon?: number[][];
  };
  text: string;
  confidence?: number;
  readingOrder?: number;
}

export interface RecognizeResponsePayload {
  recognizedText: string;
  language: Language;
  modelName: string;
  modelVersion: string;
  processingDurationMs: number;
  confidence?: number;
  confidenceExplanation?: string;
  lineRegions?: LineRegionData[];
  warnings?: string[];
}

export interface AiModelInfo {
  id: string;
  name: string;
  version: string;
  languages: Language[];
  supportedScripts: string[];
  description: string;
  architecture: string;
  isDefault: boolean;
}

export interface AiHealthResponse {
  status: 'healthy' | 'degraded' | 'unavailable';
  version: string;
  gpuAvailable: boolean;
  device: string;
  modelsLoaded: string[];
}
