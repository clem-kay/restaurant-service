import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '-';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const contentLength = res.get('content-length') ?? '-';

      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger[level](
        `${method} ${originalUrl} ${statusCode} ${duration}ms ${contentLength}b — ${ip} "${userAgent}"`,
      );
    });

    next();
  }
}
