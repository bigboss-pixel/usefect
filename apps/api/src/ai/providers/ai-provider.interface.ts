export type AiTextInput =
  | string
  | Array<{
      type: 'text';
      text: string;
    } | {
      type: 'image';
      data: string;
      mime_type: string;
    }>;

export type AiProviderRequest = {
  input: AiTextInput;
  previousInteractionId?: string;
  stream?: boolean;
};

export type AiProviderResponse = {
  id: string;
  output_text: string;
};

export type AiProviderEvent =
  | {
      type: 'text';
      text: string;
      interactionId?: string;
    }
  | {
      type: 'interaction';
      interactionId: string;
    }
  | {
      type: 'error';
      message: string;
      code?: string;
    };

export interface AiProvider {
  readonly name: string;

  create(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse>;

  stream(
    request: AiProviderRequest,
  ): AsyncGenerator<AiProviderEvent>;
}
