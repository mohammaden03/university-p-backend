import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TranscriptionsService } from './transcriptions.service';
import {
  CreateTranscriptionDto,
  UpdateTranscriptionDto,
} from './dto/create-transcription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transcriptions & Revision History')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TranscriptionsController {
  constructor(
    @Inject(TranscriptionsService) private readonly transcriptionsService: TranscriptionsService,
  ) {}

  @Get('pages/:pageId/transcriptions')
  @ApiOperation({
    summary: 'Get all transcription revisions for a page',
    description: 'Retrieves the complete revision history (both AI and human revisions) for a manuscript page.',
  })
  async findByPage(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.transcriptionsService.findByPage(pageId);
  }

  @Get('transcriptions/:id')
  @ApiOperation({
    summary: 'Get single transcription revision details',
    description: 'Retrieves specific revision text, normalized search text, line annotations, and attribution.',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transcriptionsService.findOne(id);
  }

  @Post('pages/:pageId/transcriptions')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Create a manual human transcription for a page',
    description: 'Creates a ground-truth or initial human transcription revision for the page.',
  })
  @SwaggerResponse({ status: 201, description: 'Transcription revision created' })
  async createManual(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() dto: CreateTranscriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transcriptionsService.createManual(pageId, dto, userId);
  }

  @Patch('transcriptions/:id')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Edit transcription and record new revision',
    description: 'Preserves the original AI or previous text intact, creating a new revision with human attribution.',
  })
  @SwaggerResponse({ status: 200, description: 'New revision created and activated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTranscriptionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transcriptionsService.createHumanRevision(id, dto, userId);
  }

  @Post('transcriptions/:id/set-current')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Set a specific historical revision as current',
    description: 'Transactionally activates a chosen historical revision for search and display.',
  })
  async setCurrent(@Param('id', ParseUUIDPipe) id: string) {
    return this.transcriptionsService.setCurrentRevision(id);
  }
}
