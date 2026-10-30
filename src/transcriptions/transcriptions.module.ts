import { Module } from '@nestjs/common';
import { TranscriptionsService } from './transcriptions.service';
import { TranscriptionsController } from './transcriptions.controller';

@Module({
  controllers: [TranscriptionsController],
  providers: [TranscriptionsService],
  exports: [TranscriptionsService],
})
export class TranscriptionsModule {}
