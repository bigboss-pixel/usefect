'use client';

import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowUp,
  Globe,
  Paperclip,
} from 'lucide-react';

type Source = {
  id: number;
  title: string;
  url: string;
  source: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
};

export default function AIPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFileMimeType, setUploadedFileMimeType] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(
        'usefect-ai-messages',
      );
      const savedInteractionId = localStorage.getItem(
        'usefect-ai-interaction-id',
      );

      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }

      if (savedInteractionId) {
        setInteractionId(savedInteractionId);
      }
    } catch (error) {
      console.error(
        'Failed to restore USEFECT AI conversation:',
        error,
      );
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'usefect-ai-messages',
        JSON.stringify(messages),
      );
    } catch (error) {
      console.error(
        'Failed to save USEFECT AI messages:',
        error,
      );
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (interactionId) {
        localStorage.setItem(
          'usefect-ai-interaction-id',
          interactionId,
        );
      } else {
        localStorage.removeItem(
          'usefect-ai-interaction-id',
        );
      }
    } catch (error) {
      console.error(
        'Failed to save USEFECT AI interaction:',
        error,
      );
    }
  }, [interactionId]);

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if ((!trimmedMessage && !attachedFile) || loading) {
      return;
    }

    if (attachedFile && !uploadedFileId) {
      setFileError(
        'File masih diproses. Tunggu upload selesai lalu coba lagi.',
      );
      return;
    }

    const effectiveMessage =
      trimmedMessage ||
      'Analyze the attached image and explain what you can determine from it.';

    const userMessage: Message = {
      role: 'user',
      content: effectiveMessage,
    };

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
    };

    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ]);

    const assistantIndex = messages.length + 1;

    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(
        'http://localhost:3001/ai/chat/stream',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: effectiveMessage,
            webSearch,
            ...(interactionId
              ? {
                  previousInteractionId: interactionId,
                }
              : {}),
            ...(uploadedFileId
              ? {
                  fileId: uploadedFileId,
                }
              : {}),
            ...(uploadedFileMimeType
              ? {
                  fileMimeType: uploadedFileMimeType,
                }
              : {}),
          }),
        },
      );

      if (!response.ok || !response.body) {
        throw new Error(
          'USEFECT AI gagal membuka koneksi streaming.',
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const line = event
            .split('\n')
            .find((item) => item.startsWith('data: '));

          if (!line) {
            continue;
          }

          const payload = line.slice(6);

          if (payload === '[DONE]') {
            finished = true;
            break;
          }

          try {
            const data = JSON.parse(payload);

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.interactionId) {
              setInteractionId(data.interactionId);
            }

            if (data.sources) {
              setMessages((current) =>
                current.map((item, index) =>
                  index === assistantIndex
                    ? {
                        ...item,
                        sources: data.sources,
                      }
                    : item,
                ),
              );
            }

            if (data.text) {
              setMessages((current) =>
                current.map((item, index) =>
                  index === assistantIndex
                    ? {
                        ...item,
                        content:
                          item.content + data.text,
                      }
                    : item,
                ),
              );
            }
          } catch (parseError) {
            if (
              parseError instanceof Error &&
              parseError.message !== 'Unexpected end of JSON input'
            ) {
              throw parseError;
            }
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menghubungi USEFECT AI.';

      setMessages((current) =>
        current.map((item, index) =>
          index === assistantIndex
            ? {
                ...item,
                content: errorMessage,
              }
            : item,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setAttachedFile(null);
      setFileError(
        'Format file tidak didukung. Gunakan PDF, DOC, TXT, DOCX, JPG, PNG, atau WEBP.',
      );
      event.target.value = '';
      return;
    }

    if (file.size > maxSize) {
      setAttachedFile(null);
      setFileError('Ukuran file maksimal 10 MB.');
      event.target.value = '';
      return;
    }

    setAttachedFile(file);
    setUploadedFileId(null);
    setUploadedFileMimeType(null);
    setFileError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        'http://localhost:3001/ai/files',
        {
          method: 'POST',
          body: formData,
        },
      );

      const data = await response.json();

      console.log('USEFECT AI upload response:', data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'File gagal diupload.',
        );
      }

      setUploadedFileId(data.fileId);
      setUploadedFileMimeType(data.mimeType || file.type || null);
    } catch (error) {
      setAttachedFile(null);
      setUploadedFileId(null);

      setFileError(
        error instanceof Error
          ? error.message
          : 'File gagal diupload.',
      );
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    setUploadedFileId(null);
    setUploadedFileMimeType(null);
    setFileError('');
  };

  const handleNewChat = () => {
    if (loading) {
      return;
    }

    setMessages([]);
    setInteractionId(null);
    setMessage('');
    setAttachedFile(null);
    setUploadedFileId(null);
    setUploadedFileMimeType(null);
    setFileError('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <main className="usefect-ai-page">
      <div className="usefect-ai-workspace">

        <header className="usefect-ai-topbar">
          <div className="usefect-ai-brand">
            <div className="usefect-ai-logo">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <linearGradient
                    id="aiUsefectBlue"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#39d5ff" />
                    <stop offset="50%" stopColor="#0b8ff5" />
                    <stop offset="100%" stopColor="#075eea" />
                  </linearGradient>

                  <linearGradient
                    id="aiUsefectGold"
                    x1="0"
                    y1="1"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#d28d22" />
                    <stop offset="50%" stopColor="#f4b53f" />
                    <stop offset="100%" stopColor="#ffe18a" />
                  </linearGradient>
                </defs>

                <path
                  d="M31 14
                     C19 22 14 35 17 49
                     C20 63 30 75 46 86
                     L49 89
                     L49 68
                     C41 61 37 53 37 44
                     C37 34 41 25 48 18
                     C43 13 36 12 31 14Z"
                  fill="url(#aiUsefectBlue)"
                />

                <path
                  d="M69 17
                     C58 21 49 29 45 39
                     C40 51 41 66 49 88
                     C62 80 71 69 75 57
                     C79 44 77 28 69 17Z"
                  fill="url(#aiUsefectBlue)"
                />

                <path
                  d="M50 78
                     C51 64 55 52 63 43
                     C69 36 72 27 70 18
                     C60 21 52 28 48 37
                     C44 48 45 63 50 78Z"
                  fill="url(#aiUsefectGold)"
                />

                <path
                  d="M49 87
                     C48 72 49 59 53 49
                     C57 39 64 30 71 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity=".85"
                />

                <path
                  d="M78 8
                     L80.5 14
                     L87 16.5
                     L80.5 19
                     L78 25
                     L75.5 19
                     L69 16.5
                     L75.5 14Z"
                  fill="#f8c85b"
                />
              </svg>
            </div>

            <div className="usefect-ai-brand-text">
              <strong>USEFECT AI</strong>
              <span>Knowledge · Research · Discovery</span>
            </div>
          </div>

          <div className="usefect-ai-header-actions">
            <button
              type="button"
              className="usefect-ai-new-chat"
              onClick={handleNewChat}
              disabled={loading}
            >
              <span>+</span>
              <span>New Chat</span>
            </button>

            <div className="usefect-ai-status">
              <span className="usefect-ai-status-dot" />
              <span>AI Workspace</span>
            </div>
          </div>
        </header>

        <section className="usefect-ai-main">

          <div className="usefect-ai-hero">
            <h1>
              What can I help you
              <span> discover?</span>
            </h1>
          </div>

          {messages.length > 0 && (
            <div className="usefect-ai-messages">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`usefect-ai-message usefect-ai-message-${item.role}`}
                >
                  <div className="usefect-ai-message-label">
                    {item.role === 'user' ? 'You' : 'USEFECT AI'}
                  </div>

                  <div className="usefect-ai-message-content">
                    {item.role === 'assistant' ? (
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    ) : (
                      item.content
                    )}
                  </div>

                  {item.role === 'assistant' &&
                    item.sources &&
                    item.sources.length > 0 && (
                      <div className="usefect-ai-sources">
                        <div className="usefect-ai-sources-title">
                          Sources
                        </div>

                        <div className="usefect-ai-sources-list">
                          {item.sources.map((source) => (
                            <a
                              key={`${source.id}-${source.url}`}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="usefect-ai-source"
                            >
                              <span className="usefect-ai-source-number">
                                {source.id}
                              </span>

                              <span className="usefect-ai-source-info">
                                <strong>{source.title}</strong>
                                <small>{source.source}</small>
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}

              {loading &&
                messages[messages.length - 1]?.role === 'assistant' &&
                !messages[messages.length - 1]?.content && (
                  <div className="usefect-ai-message usefect-ai-message-assistant">
                    <div className="usefect-ai-message-label">
                      USEFECT AI
                    </div>

                    <div className="usefect-ai-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
            </div>
          )}

          <form
            className="usefect-ai-composer"
            onSubmit={handleSubmit}
          >
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask USEFECT AI anything..."
              rows={2}
              disabled={loading}
            />

            {(attachedFile || fileError) && (
              <div className="usefect-ai-file-preview">
                {attachedFile && (
                  <div className="usefect-ai-file-item">
                    <Paperclip size={15} />
                    <span>{attachedFile.name}</span>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      disabled={loading}
                      aria-label="Remove attached file"
                    >
                      ×
                    </button>
                  </div>
                )}

                {fileError && (
                  <div className="usefect-ai-file-error">
                    {fileError}
                  </div>
                )}
              </div>
            )}

            <div className="usefect-ai-composer-footer">

              <div className="usefect-ai-actions">

                <label className="usefect-ai-attach">
                  <Paperclip size={17} />
                  <span>Attach</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </label>

                <button
                  type="button"
                  className={webSearch ? 'active' : ''}
                  onClick={() => setWebSearch((current) => !current)}
                  disabled={loading}
                  aria-pressed={webSearch}
                >
                  <Globe size={17} />
                  <span>Web Search</span>
                </button>

              </div>

              <button
                type="submit"
                className="usefect-ai-send"
                disabled={loading}
                aria-label="Send message"
              >
                <ArrowUp size={19} />
              </button>

            </div>
          </form>

        </section>
      </div>
    </main>
  );
}
