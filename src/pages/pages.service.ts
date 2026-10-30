import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto, UpdatePageDto } from './dto/create-page.dto';
import { IStorageService } from '../files/storage.interface';

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject('IStorageService') private readonly storageService: IStorageService,
  ) {}

  async createPage(
    manuscriptId: string,
    createDto: CreatePageDto,
    file?: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid manuscript page image file must be uploaded.');
    }

    // Verify manuscript exists
    const manuscript = await this.prisma.manuscript.findUnique({
      where: { id: manuscriptId },
    });

    if (!manuscript || manuscript.isArchived) {
      throw new NotFoundException(`Manuscript with ID '${manuscriptId}' not found.`);
    }

    // Prevent duplicate page number within the same manuscript
    const existingPage = await this.prisma.manuscriptPage.findFirst({
      where: {
        manuscriptId,
        pageNumber: createDto.pageNumber,
        isArchived: false,
      },
    });

    if (existingPage) {
      throw new ConflictException(
        `Page number ${createDto.pageNumber} already exists in manuscript '${manuscript.title}'.`,
      );
    }

    // Persist file via storage service abstraction
    const savedMetadata = await this.storageService.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // Save page record in database
    return this.prisma.manuscriptPage.create({
      data: {
        manuscriptId,
        pageNumber: createDto.pageNumber,
        imageStorageKey: savedMetadata.storageKey,
        originalFilename: savedMetadata.originalFilename,
        mimeType: savedMetadata.mimeType,
        fileSize: savedMetadata.fileSize,
        checksum: savedMetadata.checksum,
        width: createDto.width || savedMetadata.width,
        height: createDto.height || savedMetadata.height,
      },
      include: {
        manuscript: {
          select: { id: true, title: true, language: true, scriptType: true },
        },
      },
    });
  }

  async findByManuscript(manuscriptId: string) {
    // Check manuscript exists
    const manuscript = await this.prisma.manuscript.findUnique({
      where: { id: manuscriptId },
    });

    if (!manuscript || manuscript.isArchived) {
      throw new NotFoundException(`Manuscript with ID '${manuscriptId}' not found.`);
    }

    const pages = await this.prisma.manuscriptPage.findMany({
      where: {
        manuscriptId,
        isArchived: false,
      },
      orderBy: { pageNumber: 'asc' },
      include: {
        transcriptions: {
          where: { isCurrent: true },
          take: 1,
          select: {
            id: true,
            text: true,
            source: true,
            revisionNumber: true,
            confidence: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            processingJobs: true,
            transcriptions: true,
            datasetSamples: true,
          },
        },
      },
    });

    return pages;
  }

  async findOne(pageId: string) {
    const page = await this.prisma.manuscriptPage.findUnique({
      where: { id: pageId },
      include: {
        manuscript: {
          select: {
            id: true,
            title: true,
            author: true,
            language: true,
            scriptType: true,
            historicalPeriod: true,
            repositoryName: true,
          },
        },
        transcriptions: {
          orderBy: { revisionNumber: 'desc' },
          include: {
            createdBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        processingJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        datasetSamples: true,
      },
    });

    if (!page || page.isArchived) {
      throw new NotFoundException(`Manuscript page with ID '${pageId}' not found.`);
    }

    return page;
  }

  async updatePage(pageId: string, updateDto: UpdatePageDto) {
    const page = await this.findOne(pageId);

    if (
      updateDto.pageNumber !== undefined &&
      updateDto.pageNumber !== page.pageNumber
    ) {
      // Check duplicate
      const duplicate = await this.prisma.manuscriptPage.findFirst({
        where: {
          manuscriptId: page.manuscriptId,
          pageNumber: updateDto.pageNumber,
          isArchived: false,
          NOT: { id: pageId },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Page number ${updateDto.pageNumber} already exists in this manuscript.`,
        );
      }
    }

    return this.prisma.manuscriptPage.update({
      where: { id: pageId },
      data: updateDto,
    });
  }

  async removePage(pageId: string) {
    const page = await this.findOne(pageId);

    // Safeguard academic data: if page has transcriptions or dataset samples, archive instead of delete
    const hasAcademicData =
      page.transcriptions.length > 0 || page.datasetSamples.length > 0;

    if (hasAcademicData) {
      await this.prisma.manuscriptPage.update({
        where: { id: pageId },
        data: { isArchived: true },
      });
      return {
        success: true,
        message: 'Page safely archived to preserve transcription and dataset history.',
        archived: true,
      };
    }

    // If completely pristine page with no academic data, delete DB record and file
    await this.prisma.manuscriptPage.delete({
      where: { id: pageId },
    });

    await this.storageService.deleteFile(page.imageStorageKey);

    return {
      success: true,
      message: 'Page and image file permanently deleted.',
      archived: false,
    };
  }

  async getPageImageStream(pageId: string) {
    const page = await this.prisma.manuscriptPage.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        imageStorageKey: true,
        mimeType: true,
        originalFilename: true,
        isArchived: true,
      },
    });

    if (!page || page.isArchived) {
      throw new NotFoundException(`Page '${pageId}' not found.`);
    }

    const stream = await this.storageService.getFileStream(page.imageStorageKey);
    return {
      stream,
      mimeType: page.mimeType,
      originalFilename: page.originalFilename,
    };
  }
}
