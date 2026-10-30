import {
  Controller,
  Post,
  Get,
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
import { ProcessingService } from './processing.service';
import { RecognizePageDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('HTR & OCR Processing')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ProcessingController {
  constructor(
    @Inject(ProcessingService) private readonly processingService: ProcessingService,
  ) {}

  @Post('pages/:pageId/recognize')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Trigger AI HTR/OCR recognition for a manuscript page',
    description: 'Creates a processing job, invokes the Python HTR pipeline, validates output, and saves recognized text as a new revision.',
  })
  @SwaggerResponse({ status: 201, description: 'Recognition job succeeded and persisted' })
  @SwaggerResponse({ status: 503, description: 'External Python AI service unavailable' })
  async recognize(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RecognizePageDto,
  ) {
    return this.processingService.processPageRecognition(pageId, userId, dto);
  }

  @Get('processing/:jobId')
  @ApiOperation({
    summary: 'Get processing job status',
    description: 'Retrieves current status (PENDING, RUNNING, SUCCEEDED, FAILED) of an HTR job.',
  })
  @SwaggerResponse({ status: 200, description: 'Job status retrieved' })
  @SwaggerResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.processingService.getJob(jobId);
  }

  @Get('processing/:jobId/result')
  @ApiOperation({
    summary: 'Get processing job transcription result',
    description: 'Retrieves transcriptions, line regions, and duration metrics produced by a succeeded job.',
  })
  async getJobResult(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.processingService.getJobResult(jobId);
  }

  @Get('pages/:pageId/processing-history')
  @ApiOperation({
    summary: 'Get processing history for a page',
    description: 'Lists all historical recognition jobs triggered for a specific manuscript page.',
  })
  async getPageHistory(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.processingService.getPageProcessingHistory(pageId);
  }
}
