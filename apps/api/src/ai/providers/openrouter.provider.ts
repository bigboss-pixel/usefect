import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  AiProviderEvent,
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.interface.js';

@Injectable()
export class OpenRouterProvider
  implements AiProvider
{
  readonly name = 'openrouter';

  private get apiKey(): string {
    const key =
      process.env.OPENROUTER_API_KEY;

    if (!key) {
      throw new Error(
        'OPENROUTER_API_KEY is not configured',
      );
    }

    return key;
  }

  private get model(): string {
    return (
      process.env.OPENROUTER_MODEL ||
      'openrouter/free'
    );
  }

  async create(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content:
                this.toOpenRouterContent(
                  request.input,
                ),
            },
          ],
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          'OpenRouter request failed',
      );
    }

    return {
      id:
        data?.id ||
        `openrouter-${Date.now()}`,
      output_text:
        data?.choices?.[0]?.message?.content ||
        '',
    };
  }

  async *stream(
    request: AiProviderRequest,
  ): AsyncGenerator<AiProviderEvent> {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content:
                this.toOpenRouterContent(
                  request.input,
                ),
            },
          ],
          stream: true,
        }),
      },
    );

    if (!response.ok || !response.body) {
      const data = await response
        .json()
        .catch(() => null);

      yield {
        type: 'error',
        message:
          data?.error?.message ||
          'OpenRouter streaming request failed',
        code:
          data?.error?.code,
      };

      return;
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = '';

    while (true) {
      const { value, done } =
        await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      const lines =
        buffer.split('\n');

      buffer =
        lines.pop() || '';

      for (const line of lines) {
        const trimmed =
          line.trim();

        if (
          !trimmed ||
          !trimmed.startsWith('data:')
        ) {
          continue;
        }

        const payload =
          trimmed.slice(5).trim();

        if (payload === '[DONE]') {
          return;
        }

        try {
          const data =
            JSON.parse(payload);

          const text =
            data?.choices?.[0]?.delta
              ?.content;

          if (text) {
            yield {
              type: 'text',
              text,
            };
          }
        } catch {
          continue;
        }
      }
    }
  }

  private toOpenRouterContent(
    input: AiProviderRequest['input'],
  ) {
    if (typeof input === 'string') {
      return input;
    }

    return input.map((item) => {
      if (item.type === 'text') {
        return {
          type: 'text',
          text: item.text,
        };
      }

      return {
        type: 'image_url',
        image_url: {
          url: `data:${item.mime_type};base64,${item.data}`,
        },
      };
    });
  }
}
