import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiClientService } from '../ai-client/ai-client.service';
import { RecognizePageDto } from './dto/create-job.dto';
import { JobStatus, TranscriptionSource } from '@prisma/client';
import { PersianArabicNormalizer } from '../search/persian-arabic-normalizer';
import { IStorageService } from '../files/storage.interface';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AiClientService) private readonly aiClient: AiClientService,
    @Inject('IStorageService') private readonly storageService: IStorageService,
  ) {}

  /**
   * Orchestrates the complete OCR/HTR workflow
   */
  async processPageRecognition(
    pageId: string,
    userId: string,
    dto: RecognizePageDto,
  ) {
    // 1. Validate page access and image availability
    const page = await this.prisma.manuscriptPage.findUnique({
      where: { id: pageId },
      include: {
        manuscript: { select: { id: true, title: true, language: true } },
      },
    });

    if (!page || page.isArchived) {
      throw new NotFoundException(`Manuscript page '${pageId}' not found.`);
    }

    // Verify physical image file exists
    const fileExists = await this.storageService.fileExists(page.imageStorageKey);
    if (!fileExists) {
      throw new NotFoundException(
        `Page image file for storage key '${page.imageStorageKey}' is missing from storage.`,
      );
    }

    // 2. Prevent accidental duplicate jobs when an idempotency key is supplied
    if (dto.idempotencyKey) {
      const existingJob = await this.prisma.processingJob.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          transcriptions: {
            where: { isCurrent: true },
          },
        },
      });

      if (existingJob) {
        this.logger.log(
          `Idempotent match found for key ${dto.idempotencyKey} (Job: ${existingJob.id}, Status: ${existingJob.status})`,
        );
        return existingJob;
      }
    }

    const targetLanguage = dto.language || page.manuscript.language;

    // 3. Create ProcessingJob with status PENDING
    const job = await this.prisma.processingJob.create({
      data: {
        pageId,
        requestedById: userId,
        idempotencyKey: dto.idempotencyKey || null,
        status: JobStatus.PENDING,
        language: targetLanguage,
        modelName: dto.modelName || null,
        processingOptions: dto.processingOptions ? (dto.processingOptions as any) : undefined,
      },
    });

    // 4. Set RUNNING when execution begins
    const startedAt = new Date();
    await this.prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.RUNNING,
        startedAt,
      },
    });

    try {
      // 5. Call Python AI service with timeout & bounded retry
      const aiResponse = await this.aiClient.recognize({
        pageId,
        imageStorageKey: page.imageStorageKey,
        language: targetLanguage,
        modelName: dto.modelName,
        processingOptions: dto.processingOptions,
      });

      // 6. Normalization & revision calculation
      const normalizedText = PersianArabicNormalizer.normalize(
        aiResponse.recognizedText,
      );

      // Find highest revision number for this page
      const latestRevision = await this.prisma.transcription.findFirst({
        where: { pageId },
        orderBy: { revisionNumber: 'desc' },
        select: { revisionNumber: true },
      });
      const nextRevision = (latestRevision?.revisionNumber || 0) + 1;

      // 7. Persist recognized text and model metadata transactionally
      const result = await this.prisma.$transaction(async (tx) => {
        // Demote existing current transcriptions
        await tx.transcription.updateMany({
          where: { pageId, isCurrent: true },
          data: { isCurrent: false },
        });

        // Insert new transcription
        const createdTranscription = await tx.transcription.create({
          data: {
            pageId,
            processingJobId: job.id,
            text: aiResponse.recognizedText,
            normalizedText,
            source: TranscriptionSource.AI,
            isCurrent: true,
            createdById: userId,
            revisionNumber: nextRevision,
            confidence: aiResponse.confidence || null,
            lineRegions: aiResponse.lineRegions ? (aiResponse.lineRegions as any) : undefined,
            notes: aiResponse.confidenceExplanation
              ? `Model: ${aiResponse.modelName} v${aiResponse.modelVersion}. ${aiResponse.confidenceExplanation}`
              : `Recognized by ${aiResponse.modelName} v${aiResponse.modelVersion}`,
          },
        });

        // Insert LineRegions if provided
        if (aiResponse.lineRegions && aiResponse.lineRegions.length > 0) {
          for (const region of aiResponse.lineRegions) {
            await tx.lineRegion.create({
              data: {
                pageId,
                transcriptionId: createdTranscription.id,
                lineNumber: region.lineNumber,
                boundingBox: region.boundingBox as any,
                text: region.text,
                confidence: region.confidence,
                readingOrder: region.readingOrder,
              },
            });
          }
        }

        // 8. Mark job SUCCEEDED
        const completedJob = await tx.processingJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.SUCCEEDED,
            modelName: aiResponse.modelName,
            modelVersion: aiResponse.modelVersion,
            executionDurationMs: aiResponse.processingDurationMs,
            completedAt: new Date(),
          },
          include: {
            transcriptions: {
              where: { id: createdTranscription.id },
            },
          },
        });

        return completedJob;
      });

      return result;
    } catch (error: any) {
      // 9. On failure, store safe error code and mark job FAILED
      const completedAt = new Date();
      const errorCode = error?.response?.data?.code || error?.name || 'INFERENCE_FAILED';
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Deep-learning recognition failed.';

      await this.prisma.processingJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorCode: String(errorCode).slice(0, 50),
          errorMessage: String(errorMessage).slice(0, 500),
          completedAt,
        },
      });

      this.logger.error(
        `Job ${job.id} for page ${pageId} failed with code [${errorCode}]: ${errorMessage}`,
      );

      // Re-throw so caller gets HTTP error response
      throw error;
    }
  }

  async getJob(jobId: string) {
    const job = await this.prisma.processingJob.findUnique({
      where: { id: jobId },
      include: {
        page: {
          select: {
            id: true,
            pageNumber: true,
            manuscriptId: true,
            manuscript: { select: { title: true } },
          },
        },
        requestedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Processing job with ID '${jobId}' not found.`);
    }

    return job;
  }

  async getJobResult(jobId: string) {
    const job = await this.prisma.processingJob.findUnique({
      where: { id: jobId },
      include: {
        transcriptions: {
          include: {
            lineAnnotations: {
              orderBy: { lineNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Processing job '${jobId}' not found.`);
    }

    return {
      jobId: job.id,
      status: job.status,
      modelName: job.modelName,
      modelVersion: job.modelVersion,
      executionDurationMs: job.executionDurationMs,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      transcriptions: job.transcriptions,
    };
  }

  async getPageProcessingHistory(pageId: string) {
    const page = await this.prisma.manuscriptPage.findUnique({
      where: { id: pageId },
    });

    if (!page || page.isArchived) {
      throw new NotFoundException(`Page '${pageId}' not found.`);
    }

    return this.prisma.processingJob.findMany({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }
}
