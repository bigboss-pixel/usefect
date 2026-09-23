import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AiProvider,
  AiProviderRequest,
} from './ai-provider.interface.js';
import { GeminiProvider } from './gemini.provider.js';
import { OpenRouterProvider } from './openrouter.provider.js';

@Injectable()
export class AiProviderService {
  private readonly providers: Map<
    string,
    AiProvider
  >;

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly openRouterProvider: OpenRouterProvider,
  ) {
    this.providers = new Map<string, AiProvider>([
      [
        geminiProvider.name,
        geminiProvider,
      ],
      [
        openRouterProvider.name,
        openRouterProvider,
      ],
    ]);
  }

  getProvider(
    name?: string,
  ): AiProvider {
    const providerName =
      name ||
      process.env.AI_PROVIDER ||
      'gemini';

    const provider =
      this.providers.get(providerName);

    if (!provider) {
      throw new ServiceUnavailableException(
        `AI provider "${providerName}" is not configured.`,
      );
    }

    return provider;
  }

  async create(
    request: AiProviderRequest,
    providerName?: string,
  ) {
    return this.getProvider(
      providerName,
    ).create(request);
  }

  stream(
    request: AiProviderRequest,
    providerName?: string,
  ) {
    return this.getProvider(
      providerName,
    ).stream(request);
  }

  listProviders() {
    return Array.from(
      this.providers.values(),
    ).map((provider) => ({
      name: provider.name,
    }));
  }
}
