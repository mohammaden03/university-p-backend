import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { ManuscriptsService } from './manuscripts.service';
import { CreateManuscriptDto } from './dto/create-manuscript.dto';
import { UpdateManuscriptDto, QueryManuscriptDto } from './dto/update-manuscript.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Manuscripts')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manuscripts')
export class ManuscriptsController {
  constructor(
    @Inject(ManuscriptsService) private readonly manuscriptsService: ManuscriptsService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Register a new manuscript',
    description: 'Creates a new manuscript book entry with bibliographic metadata, script type, and historical period.',
  })
  @SwaggerResponse({ status: 201, description: 'Manuscript created' })
  async create(
    @Body() createDto: CreateManuscriptDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.manuscriptsService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List manuscripts with filtering and pagination',
    description: 'Retrieves manuscripts filtered by language, script type, historical period, or title search.',
  })
  @SwaggerResponse({ status: 200, description: 'Paginated list of manuscripts' })
  async findAll(@Query() query: QueryManuscriptDto) {
    return this.manuscriptsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get manuscript details with page list',
    description: 'Retrieves complete manuscript metadata and its constituent pages.',
  })
  @SwaggerResponse({ status: 200, description: 'Manuscript details retrieved' })
  @SwaggerResponse({ status: 404, description: 'Manuscript not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.manuscriptsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.RESEARCHER)
  @ApiOperation({
    summary: 'Update manuscript bibliographic metadata',
  })
  @SwaggerResponse({ status: 200, description: 'Manuscript updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateManuscriptDto,
  ) {
    return this.manuscriptsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Safely archive or delete manuscript',
    description: 'Archives the manuscript safely to protect academic transcription records. Admin only.',
  })
  @SwaggerResponse({ status: 200, description: 'Manuscript safely archived or removed' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hardDelete') hardDelete?: string,
  ) {
    return this.manuscriptsService.remove(id, hardDelete === 'true');
  }
}
