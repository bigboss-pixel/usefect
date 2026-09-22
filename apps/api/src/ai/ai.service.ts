import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AiFilesService } from './files/ai-files.service.js';
import { WebSearchService } from './search/web-search.service.js';

type StreamSource = {
  id: number;
  title: string;
  url: string;
  source: string;
};

type StreamEvent =
  | {
      text: string;
      interactionId?: string;
    }
  | {
      interactionId?: string;
      sources: StreamSource[];
    }
  | {
      interactionId: string;
    };

@Injectable()
export class AiService {
  private readonly client: GoogleGenAI;

  constructor(
    private readonly aiFilesService: AiFilesService,
    private readonly webSearchService: WebSearchService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.client = new GoogleGenAI({ apiKey });
  }

  private async buildInput(
    message: string,
    fileId?: string,
    fileMimeType?: string,
    webSearch = false,
  ) {
    const contexts: string[] = [];

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
              '',
              '--- ATTACHED DOCUMENT ---',
              fileText,
              '--- END ATTACHED DOCUMENT ---',
            ].join('\\n'),
          );
        }
      } else {
        contexts.push(
          [
            'The user attached an image to this conversation.',
            'Image analysis is not yet connected to the AI model.',
          ].join('\\n'),
        );
      }
    }

    const sources: StreamSource[] = [];

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
    }

    const input = !contexts.length
      ? message
      : [
          ...contexts,
          '',
          'USER QUESTION:',
          message,
        ].join('\\n\\n');

    return {
      input,
      sources,
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
        await this.client.interactions.create({
          model:
            process.env.GEMINI_MODEL ||
            'gemini-3.8-flash',
          input,
          ...(previousInteractionId
            ? {
                previous_interaction_id:
                  previousInteractionId,
              }
            : {}),
        });

      return {
        success: true,
        message: response.output_text,
        interactionId: response.id,
        sources,
      };
    } catch (error) {
      console.error('USEFECT AI error:', error);

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
        const { input, sources } =
          await this.buildInput(
            message,
            fileId,
            fileMimeType,
            webSearch,
          );

        const stream =
          await this.client.interactions.create({
            model:
              process.env.GEMINI_MODEL ||
              'gemini-3.8-flash',
            input,
            ...(previousInteractionId
              ? {
                  previous_interaction_id:
                    previousInteractionId,
                }
              : {}),
            stream: true,
          });

        let interactionId = '';
        let receivedText = false;

        for await (const event of stream) {
          const eventData = event as any;

          if (eventData.interaction?.id) {
            interactionId =
              eventData.interaction.id;
          }

          if (eventData.event_type === 'error') {
            const errorMessage =
              eventData.error?.message ||
              'Gemini temporarily unavailable';

            throw new Error(errorMessage);
          }

          if (
            eventData.event_type !==
            'step.delta'
          ) {
            continue;
          }

          const delta = eventData.delta;

          if (
            delta?.type === 'text' &&
            delta.text
          ) {
            receivedText = true;

            yield {
              text: delta.text,
              ...(interactionId
                ? { interactionId }
                : {}),
            };

            continue;
          }

          if (
            delta?.content?.type === 'text' &&
            delta.content.text
          ) {
            receivedText = true;

            yield {
              text: delta.content.text,
              ...(interactionId
                ? { interactionId }
                : {}),
            };
          }
        }

        if (receivedText) {
          if (sources.length) {
            yield {
              interactionId: interactionId || undefined,
              sources,
            };
          }

          if (interactionId) {
            yield { interactionId };
          }

          return;
        }

        if (attempt === maxAttempts) {
          throw new Error(
            'Gemini tidak mengirimkan respons teks.',
          );
        }
      } catch (error) {
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
