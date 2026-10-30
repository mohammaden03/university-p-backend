import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: 'IStorageService',
      useClass: LocalStorageService,
    },
    LocalStorageService,
  ],
  exports: ['IStorageService', LocalStorageService],
})
export class FilesModule {}
