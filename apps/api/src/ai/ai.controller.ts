import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Param,
  Res,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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

  @Get('image-proxy')
  async imageProxy(
    @Query('url') imageUrl: string,
    @Res() res: Response,
  ) {
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required.',
      });
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL.',
      });
    }

    if (
      parsedUrl.protocol !== 'http:' &&
      parsedUrl.protocol !== 'https:'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported image URL protocol.',
      });
    }

    try {
      const response = await fetch(
        parsedUrl.toString(),
        {
          headers: {
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'User-Agent':
              'Mozilla/5.0 (compatible; USEFECT/1.0)',
          },
        },
      );

      if (!response.ok) {
        return res.status(502).json({
          success: false,
          message: 'Unable to retrieve image.',
        });
      }

      const contentType =
        response.headers.get('content-type') || '';

      if (!contentType.startsWith('image/')) {
        return res.status(415).json({
          success: false,
          message: 'Remote resource is not an image.',
        });
      }

      const contentLength = Number(
        response.headers.get('content-length') || 0,
      );

      if (contentLength > 10 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: 'Image is too large.',
        });
      }

      const buffer = Buffer.from(
        await response.arrayBuffer(),
      );

      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          message: 'Image is too large.',
        });
      }

      res.setHeader(
        'Content-Type',
        contentType,
      );
      res.setHeader(
        'Cache-Control',
        'public, max-age=86400',
      );

      return res.status(200).send(buffer);
    } catch (error) {
      console.error(
        'USEFECT AI image proxy error:',
        error,
      );

      return res.status(502).json({
        success: false,
        message: 'Unable to retrieve image.',
      });
    }
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
      dto.fileId,
      dto.fileMimeType,
      dto.webSearch,
    );
  }

  @Post('chat/stream')
  async streamChat(
    @Body() dto: ChatDto,
    @Req() req: Request,
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
        const outputEvent =
          event &&
          'images' in event &&
          Array.isArray(event.images)
            ? {
                ...event,
                images: event.images.map(
                  (imageUrl) =>
                    `${req.protocol}://${req.get('host')}/ai/image-proxy?url=${encodeURIComponent(
                      imageUrl,
                    )}`,
                ),
              }
            : event;

        res.write(
          `data: ${JSON.stringify(outputEvent)}\n\n`,
        );
      }

      res.write('data: [DONE]\n\n');
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
        })}\n\n`,
      );

      res.end();
    }
  }
}
