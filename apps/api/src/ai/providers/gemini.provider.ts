import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import {
  AiProvider,
  AiProviderEvent,
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.interface.js';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';

  private readonly client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  async create(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    const response =
      await this.client.interactions.create({
        model:
          process.env.GEMINI_MODEL ||
          'gemini-3.8-flash',
        input: request.input as any,
        ...(request.previousInteractionId
          ? {
              previous_interaction_id:
                request.previousInteractionId,
            }
          : {}),
      });

    return {
      id: response.id,
      output_text: response.output_text || '',
    };
  }

  async *stream(
    request: AiProviderRequest,
  ): AsyncGenerator<AiProviderEvent> {
    const stream =
      await this.client.interactions.create({
        model:
          process.env.GEMINI_MODEL ||
          'gemini-3.8-flash',
        input: request.input as any,
        ...(request.previousInteractionId
          ? {
              previous_interaction_id:
                request.previousInteractionId,
            }
          : {}),
        stream: true,
      });

    for await (const event of stream) {
      const eventData = event as any;

      if (eventData.interaction?.id) {
        yield {
          type: 'interaction',
          interactionId:
            eventData.interaction.id,
        };
      }

      if (eventData.event_type === 'error') {
        yield {
          type: 'error',
          message:
            eventData.error?.message ||
            'Gemini temporarily unavailable',
          ...(eventData.error?.code
            ? {
                code: eventData.error.code,
              }
            : {}),
        };

        return;
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
        yield {
          type: 'text',
          text: delta.text,
        };

        continue;
      }

      if (
        delta?.content?.type === 'text' &&
        delta.content.text
      ) {
        yield {
          type: 'text',
          text: delta.content.text,
        };
      }
    }
  }
}
