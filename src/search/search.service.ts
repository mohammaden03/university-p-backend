import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PersianArabicNormalizer } from './persian-arabic-normalizer';
import { Prisma, TranscriptionSource } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(queryDto: SearchQueryDto) {
    const rawQuery = queryDto.q.trim();
    const normalizedQuery = PersianArabicNormalizer.normalize(rawQuery);

    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.TranscriptionWhereInput = {
      isCurrent: true,
      page: {
        isArchived: false,
        manuscript: {
          isArchived: false,
        },
      },
    };

    // Filter by unreviewed AI vs human
    if (queryDto.includeUnreviewedAi === false) {
      where.source = TranscriptionSource.HUMAN;
    } else if (queryDto.source) {
      where.source = queryDto.source;
    }

    // Filter by manuscript metadata
    const manuscriptFilter: Prisma.ManuscriptWhereInput = {
      isArchived: false,
    };

    if (queryDto.language) {
      manuscriptFilter.language = queryDto.language;
    }
    if (queryDto.author) {
      manuscriptFilter.author = { contains: queryDto.author, mode: 'insensitive' };
    }
    if (queryDto.manuscriptTitle) {
      manuscriptFilter.title = { contains: queryDto.manuscriptTitle, mode: 'insensitive' };
    }
    if (queryDto.scriptType) {
      manuscriptFilter.scriptType = { contains: queryDto.scriptType, mode: 'insensitive' };
    }
    if (queryDto.historicalPeriod) {
      manuscriptFilter.historicalPeriod = { contains: queryDto.historicalPeriod, mode: 'insensitive' };
    }
    if (queryDto.repositoryName) {
      manuscriptFilter.repositoryName = { contains: queryDto.repositoryName, mode: 'insensitive' };
    }

    where.page = {
      ...where.page,
      manuscript: manuscriptFilter,
    };

    // Search condition on normalizedText OR original text
    where.OR = [
      { normalizedText: { contains: normalizedQuery } },
      { text: { contains: rawQuery, mode: 'insensitive' } },
    ];

    const [transcriptions, total] = await Promise.all([
      this.prisma.transcription.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ revisionNumber: 'desc' }, { createdAt: 'desc' }],
        include: {
          page: {
            select: {
              id: true,
              pageNumber: true,
              imageStorageKey: true,
              manuscriptId: true,
              manuscript: {
                select: {
                  id: true,
                  title: true,
                  author: true,
                  language: true,
                  scriptType: true,
                  historicalPeriod: true,
                  repositoryName: true,
                  catalogIdentifier: true,
                },
              },
            },
          },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.transcription.count({ where }),
    ]);

    // Enhance results with highlighted snippet and navigation links
    const results = transcriptions.map((item) => {
      const snippet = PersianArabicNormalizer.createSnippet(
        item.text,
        rawQuery,
        70,
      );

      return {
        transcriptionId: item.id,
        revisionNumber: item.revisionNumber,
        source: item.source,
        confidence: item.confidence,
        snippet,
        fullText: item.text,
        normalizedText: item.normalizedText,
        page: {
          id: item.page.id,
          pageNumber: item.page.pageNumber,
          imageUrl: `/api/v1/pages/${item.page.id}/image`,
        },
        manuscript: {
          id: item.page.manuscript.id,
          title: item.page.manuscript.title,
          author: item.page.manuscript.author,
          language: item.page.manuscript.language,
          scriptType: item.page.manuscript.scriptType,
          historicalPeriod: item.page.manuscript.historicalPeriod,
          repositoryName: item.page.manuscript.repositoryName,
          catalogIdentifier: item.page.manuscript.catalogIdentifier,
        },
        attribution: item.createdBy?.fullName || (item.source === 'AI' ? 'Automated HTR' : 'Researcher'),
        createdAt: item.createdAt,
      };
    });

    return {
      data: results,
      meta: {
        query: {
          raw: rawQuery,
          normalized: normalizedQuery,
        },
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
        searchMethod: 'Persian-Arabic Normalized Lexical Substring & Inverted Index',
        limitations:
          'Search applies deterministic Unicode normalization (unifying Yeh, Kaf, Alef, stripping Harakat/Tashkeel, and removing Tatweel). Morphological root stemming and historical orthographic mutations (e.g. archaic Persian Dhal/Dal alternation) are preserved in original text without destructive semantic guessing.',
      },
    };
  }

  async getSuggestions(prefix: string) {
    if (!prefix || prefix.trim().length < 2) {
      return [];
    }

    const norm = PersianArabicNormalizer.normalize(prefix.trim());

    // Find manuscript titles or authors starting with prefix
    const manuscripts = await this.prisma.manuscript.findMany({
      where: {
        isArchived: false,
        OR: [
          { title: { contains: norm, mode: 'insensitive' } },
          { author: { contains: norm, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { title: true, author: true },
    });

    const suggestions = new Set<string>();
    manuscripts.forEach((m) => {
      if (m.title) suggestions.add(m.title);
      if (m.author) suggestions.add(m.author);
    });

    return Array.from(suggestions);
  }
}
