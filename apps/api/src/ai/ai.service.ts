import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { AiFilesService } from './files/ai-files.service.js';
import { WebSearchService } from './search/web-search.service.js';
import { LibrarySearchService } from './library/library-search.service.js';
import { AiProviderService } from './providers/ai-provider.service.js';

type StreamSource = {
  id: number;
  title: string;
  url: string;
  source: string;
};

type TextInput = {
  type: 'text';
  text: string;
};

type ImageInput = {
  type: 'image';
  data: string;
  mime_type: string;
};

type MultimodalInput =
  | string
  | Array<TextInput | ImageInput>;

type StreamEvent =
  | {
      text: string;
      interactionId?: string;
    }
  | {
      interactionId?: string;
      sources: StreamSource[];
      images?: string[];
    }
  | {
      interactionId: string;
    };

@Injectable()
export class AiService {
  constructor(
    private readonly aiFilesService: AiFilesService,
    private readonly webSearchService: WebSearchService,
    private readonly librarySearchService: LibrarySearchService,
    private readonly aiProviderService: AiProviderService,
  ) {}

  private async buildInput(
    message: string,
    fileId?: string,
    fileMimeType?: string,
    webSearch = false,
  ) {
    const contexts: string[] = [];
    let image: ImageInput | null = null;

    if (fileId) {
      const fileResult =
        await this.aiFilesService.extractText(
          fileId,
          fileMimeType,
        );

      if ('text' in fileResult) {
        const fileText = fileResult.text.trim();

        if (fileText) {
          contexts.push(
            [
              'The user attached a document to this conversation.',
              'Use the document content below as context when answering the user.',
              'Do not invent information that is not supported by the document.',
              '',
              '--- ATTACHED DOCUMENT ---',
              fileText,
              '--- END ATTACHED DOCUMENT ---',
            ].join('\n'),
          );
        }
      } else {
        const imageData =
          await this.aiFilesService.getImageData(
            fileId,
            fileMimeType,
          );

        image = {
          type: 'image',
          data: imageData.data,
          mime_type: imageData.mimeType,
        };

        contexts.push(
          [
            'The user attached an image to this conversation.',
            'Analyze the image carefully and use visual information from it when answering.',
            'Do not claim to see details that are not actually visible.',
          ].join('\n'),
        );
      }
    }

    const sources: StreamSource[] = [];
    const images: string[] = [];

    const libraryResult =
      await this.librarySearchService.buildSearchContext(
        message,
        5,
      );

    if (libraryResult.context) {
      contexts.push(libraryResult.context);
    }

    sources.push(...libraryResult.sources);

    if (webSearch) {
      const webResult =
        await this.webSearchService.buildSearchContext(
          message,
          5,
        );

      if (webResult.context) {
        contexts.push(webResult.context);
      }

      sources.push(...webResult.sources);
      images.push(...(webResult.images || []));
    }

    if (sources.length) {
      const numberedSources = sources.map((source, index) => ({
        ...source,
        id: index + 1,
      }));

      sources.splice(
        0,
        sources.length,
        ...numberedSources,
      );

      contexts.push(
        [
          'SOURCE CITATION INSTRUCTION:',
          'The available sources are numbered in the order provided below.',
          'When using information from a source, cite it using [1], [2], [3], etc.',
          'The number must correspond to the source number shown to the user.',
          'Do not invent source numbers.',
          'Library sources represent data from the USEFECT Library catalog.',
          'Web sources represent information retrieved from the internet.',
        ].join('\n'),
      );
    }

    const userQuestion =
      message.trim() ||
      'Analyze the attached image and explain what you can determine from it.';

    const textInput = !contexts.length
      ? userQuestion
      : [
          ...contexts,
          '',
          'USER QUESTION:',
          userQuestion,
        ].join('\n\n');

    const input: MultimodalInput = image
      ? [
          {
            type: 'text',
            text: textInput,
          },
          image,
        ]
      : textInput;

    return {
      input,
      sources,
      images,
    };
  }

  async chat(
    message: string,
    previousInteractionId?: string,
    fileId?: string,
    fileMimeType?: string,
    webSearch = false,
  ) {
    try {
      const { input, sources } =
        await this.buildInput(
          message,
          fileId,
          fileMimeType,
          webSearch,
        );

      const response =
        await this.aiProviderService.create({
          input,
          ...(previousInteractionId
            ? { previousInteractionId }
            : {}),
        });

      return {
        success: true,
        message: response.output_text,
        interactionId: response.id,
        sources,
      };
    } catch (error) {
      console.error(
        'USEFECT AI error:',
        error,
      );

      throw new InternalServerErrorException(
        'USEFECT AI failed to generate a response',
      );
    }
  }

  async *streamChat(
    message: string,
    previousInteractionId?: string,
    fileId?: string,
    fileMimeType?: string,
    webSearch = false,
  ): AsyncGenerator<StreamEvent> {
    const maxAttempts = 2;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {
      try {
        const { input, sources, images } =
          await this.buildInput(
            message,
            fileId,
            fileMimeType,
            webSearch,
          );

        const stream =
          this.aiProviderService.stream({
            input,
            ...(previousInteractionId
              ? { previousInteractionId }
              : {}),
            stream: true,
          });

        let interactionId = '';
        let receivedText = false;

        for await (const event of stream) {
          if (event.type === 'interaction') {
            interactionId = event.interactionId;
            continue;
          }

          if (event.type === 'error') {
            const providerError = new Error(
              event.message,
            ) as Error & { code?: string };

            providerError.code = event.code;

            throw providerError;
          }

          if (event.type === 'text' && event.text) {
            receivedText = true;

            yield {
              text: event.text,
              ...(interactionId
                ? { interactionId }
                : {}),
            };
          }
        }

    if (receivedText) {
          if (sources.length || images.length) {
            yield {
              interactionId:
                interactionId || undefined,
              sources,
              images,
            };
          }

          if (interactionId) {
            yield { interactionId };
          }

          return;
        }

        if (attempt === maxAttempts) {
          throw new Error(
            'AI provider tidak mengirimkan respons teks.',
          );
        }
      } catch (error) {
        const errorCode =
          error instanceof Error
            ? (error as Error & { code?: string }).code
            : undefined;

        if (errorCode === 'rate_limit_exceeded') {
          console.error(
            'USEFECT AI provider rate limit reached.',
          );

          throw new Error(
            'USEFECT AI sedang mencapai batas penggunaan provider. Silakan coba lagi nanti atau gunakan provider/model lain.',
          );
        }

        if (attempt === maxAttempts) {
          console.error(
            'USEFECT AI streaming error:',
            error,
          );

          throw error;
        }

        console.warn(
          `USEFECT AI streaming attempt ${attempt} failed. Retrying...`,
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 1500),
        );
      }
    }
  }
}
