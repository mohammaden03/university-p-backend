import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  RecognizeRequestPayload,
  RecognizeResponsePayload,
  AiModelInfo,
  AiHealthResponse,
} from './ai-client.interface';

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly client: AxiosInstance;
  private readonly serviceUrl: string;
  private readonly timeoutMs: number;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.serviceUrl = this.configService.get<string>(
      'aiService.url',
      'http://ai-service:8000',
    );
    this.timeoutMs = this.configService.get<number>(
      'aiService.timeoutMs',
      30000,
    );

    this.client = axios.create({
      baseURL: this.serviceUrl,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Manuscript-HTR-Backend/1.0',
      },
    });
  }

  /**
   * Check external AI service health
   */
  async checkHealth(): Promise<AiHealthResponse> {
    try {
      const response = await this.client.get<AiHealthResponse>('/health');
      return response.data;
    } catch (err: any) {
      this.logger.warn(`AI service healthcheck failed: ${err.message}`);
      return {
        status: 'unavailable',
        version: 'unknown',
        gpuAvailable: false,
        device: 'unknown',
        modelsLoaded: [],
      };
    }
  }

  /**
   * Get available HTR/OCR models from the Python service
   */
  async getModels(): Promise<AiModelInfo[]> {
    try {
      const response = await this.client.get<{ models: AiModelInfo[] }>('/v1/models');
      return response.data.models || [];
    } catch (err: any) {
      this.logger.warn(`Failed to retrieve models from AI service: ${err.message}`);
      throw new ServiceUnavailableException(
        `Python HTR service at ${this.serviceUrl} is currently unreachable.`,
      );
    }
  }

  /**
   * Invoke Python FastAPI HTR recognition pipeline
   */
  async recognize(
    payload: RecognizeRequestPayload,
  ): Promise<RecognizeResponsePayload> {
    this.logger.log(
      `Sending HTR recognition request for page ${payload.pageId} (lang: ${payload.language})`,
    );

    let response;
    try {
      response = await this.client.post<RecognizeResponsePayload>(
        '/v1/recognize',
        payload,
      );
    } catch (error: any) {
      this.handleAxiosError(error);
    }

    const data = response!.data;
    this.validateRecognizeResponse(data);

    this.logger.log(
      `Successfully received HTR inference for page ${payload.pageId} (model: ${data.modelName} v${data.modelVersion}, ${data.processingDurationMs}ms)`,
    );

    return data;
  }

  /**
   * Strictly validates the Python response structure before persisting
   */
  private validateRecognizeResponse(data: any): asserts data is RecognizeResponsePayload {
    if (!data || typeof data !== 'object') {
      throw new BadGatewayException(
        'Invalid response from AI service: expected a JSON object.',
      );
    }

    if (typeof data.recognizedText !== 'string') {
      throw new BadGatewayException(
        'Invalid response from AI service: missing or invalid "recognizedText".',
      );
    }

    if (!data.modelName || typeof data.modelName !== 'string') {
      throw new BadGatewayException(
        'Invalid response from AI service: missing "modelName".',
      );
    }

    if (!data.modelVersion || typeof data.modelVersion !== 'string') {
      throw new BadGatewayException(
        'Invalid response from AI service: missing "modelVersion".',
      );
    }

    if (typeof data.processingDurationMs !== 'number' || data.processingDurationMs < 0) {
      throw new BadGatewayException(
        'Invalid response from AI service: invalid "processingDurationMs".',
      );
    }

    if (data.confidence !== undefined) {
      if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
        throw new BadGatewayException(
          'Invalid response from AI service: confidence must be a number between 0.0 and 1.0.',
        );
      }
    }
  }

  private handleAxiosError(error: AxiosError | any): never {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.logger.error(`AI service connection refused at ${this.serviceUrl}`);
      throw new ServiceUnavailableException({
        code: 'AI_SERVICE_UNAVAILABLE',
        message: `The Python HTR/OCR inference service is unreachable at ${this.serviceUrl}. Ensure the container is running and network is healthy.`,
      });
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      this.logger.error(`AI service timed out after ${this.timeoutMs}ms`);
      throw new ServiceUnavailableException({
        code: 'AI_SERVICE_TIMEOUT',
        message: `HTR recognition request timed out after ${this.timeoutMs}ms. Deep-learning inference took longer than permitted.`,
      });
    }

    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data as any;
      const message = responseData?.detail || responseData?.message || error.message;

      if (status >= 400 && status < 500) {
        throw new BadRequestException({
          code: 'AI_SERVICE_BAD_REQUEST',
          message: `AI service rejected request: ${message}`,
          details: responseData,
        });
      }

      throw new BadGatewayException({
        code: 'AI_SERVICE_ERROR',
        message: `Python AI service returned status ${status}: ${message}`,
      });
    }

    throw new ServiceUnavailableException({
      code: 'AI_SERVICE_ERROR',
      message: `Failed to communicate with AI service: ${error.message}`,
    });
  }
}
