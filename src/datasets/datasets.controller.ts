import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DatasetsService } from './datasets.service';
import {
  CreateDatasetSampleDto,
  UpdateDatasetSampleDto,
  QueryDatasetSampleDto,
} from './dto/sample.dto';
import { AssignManuscriptSplitsDto } from './dto/assign-splits.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, DatasetSplit } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Dataset Management & ML Export')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('datasets')
export class DatasetsController {
  constructor(
    @Inject(DatasetsService) private readonly datasetsService: DatasetsService,
  ) {}

  @Get('samples')
  @ApiOperation({
    summary: 'List dataset samples',
    description: 'Retrieves dataset samples with filtering by approval status, split, and manuscript.',
  })
  async findAll(@Query() query: QueryDatasetSampleDto) {
    return this.datasetsService.findAll(query);
  }

  @Post('samples')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Create dataset sample from manuscript page',
    description: 'Registers a manuscript page and linked transcription as a candidate dataset sample in DRAFT state.',
  })
  @SwaggerResponse({ status: 201, description: 'Sample created' })
  async create(
    @Body() dto: CreateDatasetSampleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.datasetsService.createSample(dto, userId);
  }

  @Get('samples/:id')
  @ApiOperation({ summary: 'Get sample details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.datasetsService.findOne(id);
  }

  @Patch('samples/:id')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({ summary: 'Update sample metadata or split' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDatasetSampleDto,
  ) {
    return this.datasetsService.update(id, dto);
  }

  @Post('samples/:id/approve')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Approve ground-truth dataset sample',
    description: 'Marks sample as APPROVED and records reviewer attribution for ML training inclusion.',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.datasetsService.approveSample(id, userId);
  }

  @Post('samples/:id/reject')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({ summary: 'Reject or demote sample to DRAFT status' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.datasetsService.rejectSample(id, userId);
  }

  @Post('assign-splits')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Partition dataset into Train/Validation/Test splits',
    description: 'Enforces manuscript-level grouping to ensure no page from the same manuscript leaks across train and test partitions.',
  })
  async assignSplits(@Body() dto: AssignManuscriptSplitsDto) {
    return this.datasetsService.assignSplitsWithManuscriptGrouping(dto);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get dataset metrics and split distributions',
    description: 'Returns sample counts by split, status, and manuscript coverage.',
  })
  async getStats() {
    return this.datasetsService.getStats();
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Export approved ground-truth samples to JSONL',
    description: 'Generates a JSON Lines export containing verified transcriptions and safe image references.',
  })
  @ApiQuery({ name: 'split', enum: DatasetSplit, required: false })
  async exportJsonl(
    @Query('split') split: DatasetSplit | undefined,
    @Res() res: Response,
  ) {
    const jsonl = await this.datasetsService.exportApprovedSamplesJsonl(split);

    res.set({
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': `attachment; filename="manuscript_htr_dataset_${split || 'all'}_${Date.now()}.jsonl"`,
    });

    res.send(jsonl);
  }
}
