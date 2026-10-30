import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDatasetSampleDto,
  UpdateDatasetSampleDto,
  QueryDatasetSampleDto,
} from './dto/sample.dto';
import { AssignManuscriptSplitsDto } from './dto/assign-splits.dto';
import {
  DatasetSampleStatus,
  DatasetSplit,
  Prisma,
} from '@prisma/client';

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createSample(dto: CreateDatasetSampleDto, userId: string) {
    const page = await this.prisma.manuscriptPage.findUnique({
      where: { id: dto.pageId },
      include: {
        transcriptions: {
          where: { isCurrent: true },
          take: 1,
        },
      },
    });

    if (!page || page.isArchived) {
      throw new NotFoundException(`Manuscript page '${dto.pageId}' not found.`);
    }

    const effectiveTranscriptionId =
      dto.transcriptionId || page.transcriptions[0]?.id;

    if (!effectiveTranscriptionId) {
      throw new BadRequestException(
        'Page does not currently have any transcription to use as ground-truth annotation.',
      );
    }

    return this.prisma.datasetSample.create({
      data: {
        pageId: dto.pageId,
        transcriptionId: effectiveTranscriptionId,
        split: dto.split || DatasetSplit.UNASSIGNED,
        status: DatasetSampleStatus.DRAFT,
        notes: dto.notes,
        createdById: userId,
      },
      include: {
        page: {
          select: { pageNumber: true, manuscriptId: true },
        },
        transcription: {
          select: { id: true, text: true, source: true, revisionNumber: true },
        },
      },
    });
  }

  async findAll(query: QueryDatasetSampleDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DatasetSampleWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.split) {
      where.split = query.split;
    }
    if (query.manuscriptId) {
      where.page = { manuscriptId: query.manuscriptId };
    }

    const [items, total] = await Promise.all([
      this.prisma.datasetSample.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          page: {
            select: {
              id: true,
              pageNumber: true,
              manuscriptId: true,
              manuscript: { select: { id: true, title: true, language: true } },
            },
          },
          transcription: {
            select: {
              id: true,
              text: true,
              source: true,
              revisionNumber: true,
              confidence: true,
            },
          },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
          reviewedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.datasetSample.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const sample = await this.prisma.datasetSample.findUnique({
      where: { id },
      include: {
        page: {
          include: {
            manuscript: true,
          },
        },
        transcription: {
          include: {
            lineAnnotations: {
              orderBy: { lineNumber: 'asc' },
            },
          },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException(`Dataset sample with ID '${id}' not found.`);
    }

    return sample;
  }

  async update(id: string, dto: UpdateDatasetSampleDto) {
    await this.findOne(id);

    return this.prisma.datasetSample.update({
      where: { id },
      data: dto,
    });
  }

  async approveSample(id: string, reviewerId: string) {
    await this.findOne(id);

    return this.prisma.datasetSample.update({
      where: { id },
      data: {
        status: DatasetSampleStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async rejectSample(id: string, reviewerId: string) {
    await this.findOne(id);

    return this.prisma.datasetSample.update({
      where: { id },
      data: {
        status: DatasetSampleStatus.DRAFT,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Assigns splits with strict manuscript-level grouping to prevent data leakage
   */
  async assignSplitsWithManuscriptGrouping(dto: AssignManuscriptSplitsDto) {
    const totalRatio = dto.trainRatio + dto.valRatio + dto.testRatio;
    if (Math.abs(totalRatio - 1.0) > 0.01) {
      throw new BadRequestException('Split ratios must sum up to 1.0 (100%)');
    }

    // Fetch all active samples with their manuscript IDs
    const samples = await this.prisma.datasetSample.findMany({
      include: {
        page: {
          select: { id: true, manuscriptId: true },
        },
      },
    });

    if (samples.length === 0) {
      return { message: 'No dataset samples found to split', updatedCount: 0 };
    }

    // Group samples by manuscript
    const manuscriptMap = new Map<string, string[]>(); // manuscriptId -> sampleIds[]
    for (const s of samples) {
      const mId = s.page.manuscriptId;
      if (!manuscriptMap.has(mId)) {
        manuscriptMap.set(mId, []);
      }
      manuscriptMap.get(mId)!.push(s.id);
    }

    const manuscriptIds = Array.from(manuscriptMap.keys());
    const totalManuscripts = manuscriptIds.length;

    // Allocate manuscripts to splits
    const trainCount = Math.max(1, Math.round(totalManuscripts * dto.trainRatio));
    const valCount = Math.max(
      1,
      Math.round(totalManuscripts * dto.valRatio),
    );

    const trainManuscripts = manuscriptIds.slice(0, trainCount);
    const valManuscripts = manuscriptIds.slice(trainCount, trainCount + valCount);
    const testManuscripts = manuscriptIds.slice(trainCount + valCount);

    const updates: Promise<any>[] = [];

    // Assign TRAIN
    for (const mId of trainManuscripts) {
      const sampleIds = manuscriptMap.get(mId) || [];
      updates.push(
        this.prisma.datasetSample.updateMany({
          where: { id: { in: sampleIds } },
          data: { split: DatasetSplit.TRAIN },
        }),
      );
    }

    // Assign VALIDATION
    for (const mId of valManuscripts) {
      const sampleIds = manuscriptMap.get(mId) || [];
      updates.push(
        this.prisma.datasetSample.updateMany({
          where: { id: { in: sampleIds } },
          data: { split: DatasetSplit.VALIDATION },
        }),
      );
    }

    // Assign TEST
    for (const mId of testManuscripts) {
      const sampleIds = manuscriptMap.get(mId) || [];
      updates.push(
        this.prisma.datasetSample.updateMany({
          where: { id: { in: sampleIds } },
          data: { split: DatasetSplit.TEST },
        }),
      );
    }

    await Promise.all(updates);

    return {
      message:
        'Splits assigned successfully with zero manuscript leakage across partitions.',
      totalManuscriptsGrouped: totalManuscripts,
      splits: {
        trainManuscriptsCount: trainManuscripts.length,
        validationManuscriptsCount: valManuscripts.length,
        testManuscriptsCount: testManuscripts.length,
      },
    };
  }

  async getStats() {
    const [total, approved, reviewed, draft, train, val, test, unassigned] =
      await Promise.all([
        this.prisma.datasetSample.count(),
        this.prisma.datasetSample.count({ where: { status: DatasetSampleStatus.APPROVED } }),
        this.prisma.datasetSample.count({ where: { status: DatasetSampleStatus.REVIEWED } }),
        this.prisma.datasetSample.count({ where: { status: DatasetSampleStatus.DRAFT } }),
        this.prisma.datasetSample.count({ where: { split: DatasetSplit.TRAIN } }),
        this.prisma.datasetSample.count({ where: { split: DatasetSplit.VALIDATION } }),
        this.prisma.datasetSample.count({ where: { split: DatasetSplit.TEST } }),
        this.prisma.datasetSample.count({ where: { split: DatasetSplit.UNASSIGNED } }),
      ]);

    return {
      totalSamples: total,
      byStatus: {
        approved,
        reviewed,
        draft,
      },
      bySplit: {
        train,
        validation: val,
        test,
        unassigned,
      },
      exportReadyCount: approved,
    };
  }

  /**
   * Exports approved samples into machine-learning JSONL format
   */
  async exportApprovedSamplesJsonl(split?: DatasetSplit) {
    const where: Prisma.DatasetSampleWhereInput = {
      status: DatasetSampleStatus.APPROVED,
    };

    if (split) {
      where.split = split;
    }

    const samples = await this.prisma.datasetSample.findMany({
      where,
      include: {
        page: {
          select: {
            id: true,
            pageNumber: true,
            mimeType: true,
            imageStorageKey: true,
            manuscript: {
              select: {
                id: true,
                title: true,
                author: true,
                language: true,
                scriptType: true,
                historicalPeriod: true,
              },
            },
          },
        },
        transcription: {
          select: {
            id: true,
            text: true,
            normalizedText: true,
            source: true,
            revisionNumber: true,
            confidence: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const lines = samples.map((sample) => {
      const record = {
        sample_id: sample.id,
        page_id: sample.page.id,
        manuscript_id: sample.page.manuscript.id,
        manuscript_title: sample.page.manuscript.title,
        page_number: sample.page.pageNumber,
        language: sample.page.manuscript.language,
        script_type: sample.page.manuscript.scriptType,
        split: sample.split,
        status: sample.status,
        image_relative_url: `/api/v1/pages/${sample.page.id}/image`,
        ground_truth_text: sample.transcription?.text || '',
        normalized_text: sample.transcription?.normalizedText || '',
        transcription_source: sample.transcription?.source,
        revision_number: sample.transcription?.revisionNumber,
        notes: sample.notes,
        exported_at: new Date().toISOString(),
      };
      return JSON.stringify(record);
    });

    return lines.join('\n');
  }
}
