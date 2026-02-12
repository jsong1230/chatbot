// OpenAI 공통 서비스
// F-02 (분류), F-03 (자동 답변) 공유 모듈

import OpenAI from 'openai';
import { retryWithBackoff } from '../utils/retry.utils';
import { logger } from '../utils/logger.utils';
import { AppError } from '../errors/AppError';
import { prompts } from '../lib/prompts'; // F-10: 다국어 프롬프트
import type { SupportedLanguage } from '../utils/language-detector'; // F-10

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다');
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const DEFAULT_TIMEOUT = 10000; // 10초

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * OpenAI Chat Completion API 호출 (재시도 로직 포함)
 */
export async function createChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: ChatCompletionOptions = {}
): Promise<OpenAI.Chat.ChatCompletion> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 500,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  try {
    // 재시도 로직으로 래핑 (지수 백오프 3회)
    const completion = await retryWithBackoff<OpenAI.Chat.ChatCompletion>(
      async () => {
        return openai.chat.completions.create(
          {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          },
          { timeout }
        );
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        onRetry: (attempt, error) => {
          logger.warn(`OpenAI API 재시도 (${attempt}/3): ${error.message}`);
        },
      }
    );

    return completion;
  } catch (error: any) {
    logger.error('OpenAI API 호출 실패:', error.message);
    throw new AppError(500, '분류 서비스 오류가 발생했습니다');
  }
}

/**
 * OpenAI API 응답에서 JSON 파싱
 */
export function parseJsonResponse<T>(content: string): T {
  try {
    return JSON.parse(content);
  } catch (error) {
    logger.error('OpenAI 응답 JSON 파싱 실패:', content);
    throw new AppError(500, 'AI 응답 형식이 올바르지 않습니다');
  }
}

/**
 * 답변 생성 전용 OpenAI API 호출 (F-03 전용, F-10 확장)
 * @param conversationHistory 최근 대화 이력 (최대 5개)
 * @param currentMessage 현재 사용자 메시지
 * @param categoryName 문의 카테고리 (선택)
 * @param language 답변 언어 ('ko' 또는 'en', 기본값: 'ko') - F-10
 * @returns 답변 내용 및 에스컬레이션 필요 여부
 */
export async function generateAnswer(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentMessage: string,
  categoryName?: string,
  language: SupportedLanguage = 'ko' // F-10: 기본값 'ko' (하위 호환성)
): Promise<{ content: string; needsEscalation: boolean }> {
  // F-10: 언어별 시스템 프롬프트 선택
  let systemPrompt = prompts[language].answer;

  // 카테고리 정보 추가 (언어별 번역)
  if (categoryName) {
    systemPrompt +=
      language === 'ko'
        ? `\n\n이 문의는 "${categoryName}" 카테고리로 분류되었습니다. 이를 참고하여 답변하세요.`
        : `\n\nThis inquiry has been categorized as "${categoryName}". Use this information in your response.`;
  }

  // 메시지 배열 구성
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(
      (msg) =>
        ({
          role: msg.role,
          content: msg.content,
        } as OpenAI.Chat.ChatCompletionMessageParam)
    ),
    { role: 'user', content: currentMessage },
  ];

  // OpenAI API 호출
  const completion = await createChatCompletion(messages, {
    temperature: 0.7, // 자연스러운 대화를 위해 중간 온도
    maxTokens: 500,
    timeout: 30000, // 30초 타임아웃
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('OpenAI 응답이 비어있습니다');
  }

  // F-10: 언어별 에스컬레이션 키워드 감지
  const escalationKeywords = {
    ko: '상담원 연결이 필요합니다',
    en: 'requires an agent',
  };
  const needsEscalation = responseContent.includes(escalationKeywords[language]);

  return {
    content: responseContent,
    needsEscalation,
  };
}
