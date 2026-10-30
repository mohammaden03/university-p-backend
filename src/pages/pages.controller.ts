import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseUUIDPipe,
  Res,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto, UpdatePageDto } from './dto/create-page.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Manuscript Pages')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PagesController {
  constructor(@Inject(PagesService) private readonly pagesService: PagesService) {}

  @Post('manuscripts/:manuscriptId/pages')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload and register a new page image',
    description: 'Uploads a manuscript page image (JPEG, PNG, TIFF, WebP), validates signatures, and associates it with the manuscript.',
  })
  @SwaggerResponse({ status: 201, description: 'Page created successfully' })
  @SwaggerResponse({ status: 400, description: 'Invalid file signature or size exceeded' })
  @SwaggerResponse({ status: 409, description: 'Duplicate page number in manuscript' })
  async createPage(
    @Param('manuscriptId', ParseUUIDPipe) manuscriptId: string,
    @Body() createPageDto: CreatePageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.pagesService.createPage(manuscriptId, createPageDto, file);
  }

  @Get('manuscripts/:manuscriptId/pages')
  @ApiOperation({
    summary: 'Get all pages for a manuscript',
    description: 'Returns all ordered pages in the manuscript book with their current transcriptions and status counts.',
  })
  async findByManuscript(
    @Param('manuscriptId', ParseUUIDPipe) manuscriptId: string,
  ) {
    return this.pagesService.findByManuscript(manuscriptId);
  }

  @Get('pages/:pageId')
  @ApiOperation({
    summary: 'Get page details by ID',
    description: 'Retrieves full page details including its revision history, processing jobs, and dataset samples.',
  })
  async findOne(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.pagesService.findOne(pageId);
  }

  @Patch('pages/:pageId')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({ summary: 'Update page sequence number or metadata' })
  async updatePage(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() updateDto: UpdatePageDto,
  ) {
    return this.pagesService.updatePage(pageId, updateDto);
  }

  @Delete('pages/:pageId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Delete or safely archive page',
    description: 'Protects academic data: pages with transcriptions or dataset records are safely archived rather than deleted.',
  })
  async removePage(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.pagesService.removePage(pageId);
  }

  @Get('pages/:pageId/image')
  @ApiOperation({
    summary: 'Securely stream manuscript page image',
    description: 'Streams the original manuscript page image binary with appropriate Content-Type and caching headers.',
  })
  async getPageImage(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, originalFilename } =
      await this.pagesService.getPageImageStream(pageId);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(originalFilename)}"`,
      'Cache-Control': 'private, max-age=86400',
    });

    stream.pipe(res);
  }
}
