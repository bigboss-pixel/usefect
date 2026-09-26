import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  image?: string;
};

@Injectable()
export class WebSearchService {

  async buildSearchContext(
    query: string,
    limit = 5,
  ) {
    const results = await this.search(query, limit);

    if (!results.length) {
      return {
        context: '',
        sources: [],
      };
    }

    const context = [
      'The following information was retrieved from web search.',
      'Use it as external source context when answering the user.',
      '',
      ...results.map(
        (result, index) =>
          `[SOURCE ${index + 1}]
Title: ${result.title}
URL: ${result.url}
Source: ${result.source}
Content: ${result.snippet}`,
      ),
    ].join('\n\n');

    return {
      context,
      sources: results.map((result, index) => ({
        id: index + 1,
        title: result.title,
        url: result.url,
        source: result.source,
      })),
      images: results
        .map((result) => result.image)
        .filter((url): url is string => Boolean(url)),
    };
  }

  async search(
    query: string,
    limit = 8,
  ): Promise<WebSearchResult[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'TAVILY_API_KEY is not configured.',
      );
    }

    try {
      const response = await fetch(
        'https://api.tavily.com/search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKey,
            query: trimmedQuery,
            max_results: limit,
            search_depth: 'advanced',
            include_answer: false,
            include_raw_content: false,
            include_images: true,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          'Tavily API error:',
          response.status,
          errorText,
        );

        throw new Error(
          `Tavily returned HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        results?: Array<{
          title?: string;
          url?: string;
          content?: string;
        }>;
        images?: Array<{
          url?: string;
          description?: string;
        }>;
      };

      const tavilyImages = (data.images || [])
        .map((image) => image.url)
        .filter((url): url is string => Boolean(url))
        .slice(0, limit);

      return (data.results || [])
        .slice(0, limit)
        .map((result, index) => {
          let source = 'web';

          try {
            source = new URL(
              result.url || '',
            ).hostname;
          } catch {
            // Keep default source.
          }

          return {
            title: result.title || 'Untitled',
            url: result.url || '',
            snippet: result.content || '',
            source,
            image: tavilyImages[index],
          };
        })
        .filter((result) => result.url);
    } catch (error) {
      console.error(
        'USEFECT AI web search error:',
        error,
      );

      throw new ServiceUnavailableException(
        'Web search is temporarily unavailable.',
      );
    }
  }
}
