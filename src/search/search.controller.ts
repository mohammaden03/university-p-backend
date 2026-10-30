import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Advanced Search')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search manuscript transcriptions with Persian/Arabic normalization',
    description: 'Searches across current transcriptions with automatic letter-variant folding, tashkeel/tatweel stripping, and highlighted snippets.',
  })
  @SwaggerResponse({ status: 200, description: 'Search results with snippets and metadata' })
  async search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Public()
  @Get('suggestions')
  @ApiOperation({
    summary: 'Get search autocomplete suggestions',
    description: 'Provides quick title and author suggestions based on partial input prefix.',
  })
  @ApiQuery({ name: 'prefix', required: true, type: String })
  async getSuggestions(@Query('prefix') prefix: string) {
    return this.searchService.getSuggestions(prefix);
  }
}
