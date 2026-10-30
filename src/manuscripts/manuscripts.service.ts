import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManuscriptDto } from './dto/create-manuscript.dto';
import { UpdateManuscriptDto, QueryManuscriptDto } from './dto/update-manuscript.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ManuscriptsService {
  private readonly logger = new Logger(ManuscriptsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(createDto: CreateManuscriptDto, userId: string) {
    return this.prisma.manuscript.create({
      data: {
        ...createDto,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async findAll(query: QueryManuscriptDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ManuscriptWhereInput = {
      isArchived: false,
    };

    if (query.language) {
      where.language = query.language;
    }
    if (query.scriptType) {
      where.scriptType = { contains: query.scriptType, mode: 'insensitive' };
    }
    if (query.historicalPeriod) {
      where.historicalPeriod = { contains: query.historicalPeriod, mode: 'insensitive' };
    }
    if (query.repositoryName) {
      where.repositoryName = { contains: query.repositoryName, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { author: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { catalogIdentifier: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.manuscript.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
          _count: {
            select: { pages: { where: { isArchived: false } } },
          },
        },
      }),
      this.prisma.manuscript.count({ where }),
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
    const manuscript = await this.prisma.manuscript.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        pages: {
          where: { isArchived: false },
          orderBy: { pageNumber: 'asc' },
          select: {
            id: true,
            pageNumber: true,
            imageStorageKey: true,
            originalFilename: true,
            fileSize: true,
            mimeType: true,
            width: true,
            height: true,
            createdAt: true,
            _count: {
              select: { transcriptions: true, datasetSamples: true },
            },
          },
        },
      },
    });

    if (!manuscript || manuscript.isArchived) {
      throw new NotFoundException(`Manuscript with ID '${id}' not found`);
    }

    return manuscript;
  }

  async update(id: string, updateDto: UpdateManuscriptDto) {
    await this.findOne(id);

    return this.prisma.manuscript.update({
      where: { id },
      data: updateDto,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async remove(id: string, hardDelete = false) {
    const manuscript = await this.findOne(id);

    const activePagesCount = manuscript.pages.length;

    // Academic preservation: if manuscript contains pages or transcription history,
    // safe archival must be used unless hardDelete is explicitly requested and no transcriptions exist.
    if (!hardDelete || activePagesCount > 0) {
      await this.prisma.manuscript.update({
        where: { id },
        data: { isArchived: true },
      });
      return {
        success: true,
        message: 'Manuscript archived safely to preserve academic records and page history.',
        archived: true,
      };
    }

    // Hard delete only for completely empty manuscripts
    await this.prisma.manuscript.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Empty manuscript permanently removed.',
      archived: false,
    };
  }
}
