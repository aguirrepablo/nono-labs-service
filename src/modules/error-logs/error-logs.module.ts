import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ErrorLogsService } from './error-logs.service';
import { ErrorLog, ErrorLogSchema } from '../../schemas/error-log.schema';
import { ErrorLogRepository } from '../../common/repositories/error-log.repository';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: ErrorLog.name, schema: ErrorLogSchema }]),
  ],
  providers: [ErrorLogsService, ErrorLogRepository],
  exports: [ErrorLogsService, ErrorLogRepository],
})
export class ErrorLogsModule {}
