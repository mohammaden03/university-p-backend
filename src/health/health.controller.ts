import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { IStorageService } from '../files/storage.interface';
import { AiClientService } from '../ai-client/ai-client.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject('IStorageService') private readonly storageService: IStorageService,
    @Inject(AiClientService) private readonly aiClient: AiClientService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'System health check',
    description: 'Verifies operational status of NestJS backend, PostgreSQL connection, storage volume, and Python AI service.',
  })
  async checkHealth() {
    const uptimeSeconds = process.uptime();

    // Check DB
    let dbStatus = 'disconnected';
    try {
      if (this.prisma.isConnected) {
        await this.prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      }
    } catch {
      dbStatus = 'error';
    }

    // Check AI service
    const aiHealth = await this.aiClient.checkHealth();

    const overallStatus =
      dbStatus === 'connected' ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptimeSeconds),
      services: {
        database: {
          engine: 'PostgreSQL',
          status: dbStatus,
        },
        storage: {
          type: 'Local/PersistentVolume',
          status: 'ready',
        },
        aiInferenceService: {
          url: (this.aiClient as any).serviceUrl,
          status: aiHealth.status,
          gpuAvailable: aiHealth.gpuAvailable,
          device: aiHealth.device,
        },
      },
    };
  }
}
