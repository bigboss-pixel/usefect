import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AiService } from './ai.service.js';
import { AiFilesService } from './files/ai-files.service.js';
import { ChatDto } from './dto/chat.dto.js';
import { WebSearchService } from './search/web-search.service.js';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiFilesService: AiFilesService,
    private readonly webSearchService: WebSearchService,
  ) {}

  @Post('files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/ai',
        filename: (
          _request,
          file,
          callback,
        ) => {
          const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
            extname(file.originalname).toLowerCase();

          callback(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const allowedTypes = [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        const extension = extname(
          file.originalname,
        ).toLowerCase();

        const allowedExtensions = [
          '.pdf',
          '.txt',
          '.doc',
          '.docx',
          '.jpg',
          '.jpeg',
          '.png',
          '.webp',
        ];

        const typeAllowed =
          allowedTypes.includes(file.mimetype);

        const extensionAllowed =
          allowedExtensions.includes(extension);

        if (!typeAllowed && !extensionAllowed) {
          return callback(
            new Error('File type is not supported.'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'No file was uploaded.',
      };
    }

    return {
      success: true,
      fileId: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Post('files/:fileId/text')
  async extractFileText(
    @Param('fileId') fileId: string,
    @Body('mimeType') mimeType: string,
  ) {
    return this.aiFilesService.extractText(
      fileId,
      mimeType,
    );
  }

  @Get('search')
  async search(@Query('q') query: string) {
    const results = await this.webSearchService.search(
      query || '',
    );

    return {
      success: true,
      query: query || '',
      results,
    };
  }

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    return this.aiService.chat(
      dto.message,
      dto.previousInteractionId,
    );
  }

  @Post('chat/stream')
  async streamChat(
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    res.status(200);
    res.setHeader(
      'Content-Type',
      'text/event-stream; charset=utf-8',
    );
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const event of this.aiService.streamChat(
        dto.message,
        dto.previousInteractionId,
        dto.fileId,
        dto.fileMimeType,
        dto.webSearch,
      )) {
        res.write(
          `data: ${JSON.stringify(event)}\\n\\n`,
        );
      }

      res.write('data: [DONE]\\n\\n');
      res.end();
    } catch (error) {
      console.error(
        'USEFECT AI stream controller error:',
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : 'USEFECT AI failed to generate a response';

      res.write(
        `data: ${JSON.stringify({
          error: message,
        })}\\n\\n`,
      );

      res.end();
    }
  }
}
