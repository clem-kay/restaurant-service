import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, context, stack }) => {
    const ctx = context ? ` [${context}]` : '';
    return `${timestamp} ${level}${ctx}: ${stack ?? message}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;
  private readonly logger: Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    this.logger = createLogger({
      level: isProd ? 'info' : 'debug',
      format: isProd ? prodFormat : devFormat,
      transports: [
        new transports.Console(),
        ...(isProd
          ? [
              new transports.File({ filename: 'logs/error.log', level: 'error' }),
              new transports.File({ filename: 'logs/combined.log' }),
            ]
          : []),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context: context ?? this.context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { context: context ?? this.context, stack: trace });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context: context ?? this.context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context: context ?? this.context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context: context ?? this.context });
  }
}
