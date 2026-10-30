import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTranscriptionDto,
  UpdateTranscriptionDto,
} from './dto/create-transcription.dto';
import { PersianArabicNormalizer } from '../search/persian-arabic-normalizer';
import { TranscriptionSource } from '@prisma/client';

@Injectable()
export class TranscriptionsService {
  private readonly logger = new Logger(TranscriptionsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByPage(pageId: string) {
    const page = await this.prisma.manuscriptPage.findUnique({
      where: { id: pageId },
    });

    if (!page || page.isArchived) {
      throw new NotFoundException(`Manuscript page '${pageId}' not found.`);
    }

    return this.prisma.transcription.findMany({
      where: { pageId },
      orderBy: { revisionNumber: 'desc' },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        processingJob: {
          select: {
            id: true,
            modelName: true,
            modelVersion: true,
            status: true,
            completedAt: true,
          },
        },
        _count: {
          select: { datasetSamples: true, lineAnnotations: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const transcription = await this.prisma.transcription.findUnique({
      where: { id },
      include: {
        page: {
          include: {
            manuscript: {
              select: { id: true, title: true, language: true, scriptType: true },
            },
          },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        processingJob: true,
        lineAnnotations: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!transcription) {
      throw new NotFoundException(`Transcription with ID '${id}' not found.`);
    }

    return transcription;
  }

  async createManual(
    pageId: string,
    dto: CreateTranscriptionDto,
    userId: string,
  ) {
    const page = await this.prisma.manuscriptPage.findUnique({
      where: { id: pageId },
    });

    if (!page || page.isArchived) {
      throw new NotFoundException(`Manuscript page '${pageId}' not found.`);
    }

    const normalizedText = PersianArabicNormalizer.normalize(dto.text);

    return this.prisma.$transaction(async (tx) => {
      // Find latest revision number
      const latest = await tx.transcription.findFirst({
        where: { pageId },
        orderBy: { revisionNumber: 'desc' },
        select: { revisionNumber: true },
      });
      const nextRevision = (latest?.revisionNumber || 0) + 1;

      // Demote current
      await tx.transcription.updateMany({
        where: { pageId, isCurrent: true },
        data: { isCurrent: false },
      });

      // Create new human transcription
      return tx.transcription.create({
        data: {
          pageId,
          text: dto.text,
          normalizedText,
          source: TranscriptionSource.HUMAN,
          isCurrent: true,
          createdById: userId,
          revisionNumber: nextRevision,
          notes: dto.notes,
        },
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
    });
  }

  /**
   * Edit existing transcription: preserves history by creating a new revision
   */
  async createHumanRevision(
    transcriptionId: string,
    dto: UpdateTranscriptionDto,
    userId: string,
  ) {
    const original = await this.findOne(transcriptionId);
    const pageId = original.pageId;

    const normalizedText = PersianArabicNormalizer.normalize(dto.text);

    return this.prisma.$transaction(async (tx) => {
      // Find current max revision
      const latest = await tx.transcription.findFirst({
        where: { pageId },
        orderBy: { revisionNumber: 'desc' },
        select: { revisionNumber: true },
      });
      const nextRevision = (latest?.revisionNumber || 0) + 1;

      // Demote all currently active revisions for this page
      await tx.transcription.updateMany({
        where: { pageId, isCurrent: true },
        data: { isCurrent: false },
      });

      // Create new human revision
      return tx.transcription.create({
        data: {
          pageId,
          text: dto.text,
          normalizedText,
          source: TranscriptionSource.HUMAN,
          isCurrent: true,
          createdById: userId,
          revisionNumber: nextRevision,
          notes: dto.notes || `Revised from revision #${original.revisionNumber}`,
        },
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
    });
  }

  /**
   * Select a specific historical revision as current
   */
  async setCurrentRevision(transcriptionId: string) {
    const target = await this.findOne(transcriptionId);
    const pageId = target.pageId;

    return this.prisma.$transaction(async (tx) => {
      await tx.transcription.updateMany({
        where: { pageId, isCurrent: true },
        data: { isCurrent: false },
      });

      return tx.transcription.update({
        where: { id: transcriptionId },
        data: { isCurrent: true },
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
    });
  }
}
