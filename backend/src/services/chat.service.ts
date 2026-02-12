// 채팅 비즈니스 로직
// F-03 AI 기반 자동 답변

import { MessageSender } from '@prisma/client';
import { prisma } from '../lib/prisma.client';
import { generateAnswer } from './openai.service';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger.utils';
import { ConversationService } from './conversation.service';
import { EscalationService } from './escalation.service'; // F-06
import { TemplateService } from './template.service'; // F-07
import { detectLanguage, type SupportedLanguage } from '../utils/language-detector'; // F-10

const conversationService = new ConversationService();
const escalationService = new EscalationService(); // F-06
const templateService = new TemplateService(); // F-07

interface ChatRequest {
  conversationId: string | null;
  message: string;
  userId?: string;
  sessionId?: string;
}

interface ChatResponse {
  conversationId: string;
  language: string; // F-10: 대화 언어
  userMessage: {
    id: string;
    content: string;
    sender: string;
    createdAt: Date;
  };
  assistantMessage: {
    id: string;
    content: string;
    sender: string;
    createdAt: Date;
  };
  needsEscalation: boolean;
}

export class ChatService {
  /**
   * 메시지 처리 및 답변 생성
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { conversationId, message, userId, sessionId } = request;

    // 1. 입력 검증
    if (message.length < 5 || message.length > 2000) {
      throw new AppError(400, '메시지는 5자 이상 2000자 이하여야 합니다');
    }

    if (!userId && !sessionId) {
      throw new AppError(401, '인증이 필요합니다');
    }

    // 2. Conversation 확인 또는 생성
    let conversation;
    let detectedLanguage: SupportedLanguage = 'ko'; // F-10: 기본 언어

    if (conversationId) {
      // 기존 대화 조회
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { category: true },
      });

      if (!conversation) {
        throw new AppError(404, '대화를 찾을 수 없습니다');
      }

      // 소유권 확인
      if (
        (userId && conversation.userId !== userId) ||
        (sessionId && conversation.sessionId !== sessionId)
      ) {
        throw new AppError(403, '대화에 접근할 권한이 없습니다');
      }

      // F-10: 기존 대화의 언어 사용 (재감지 안 함)
      detectedLanguage = conversation.language as SupportedLanguage;
    } else {
      // F-10: 신규 대화 → 언어 감지
      const { language, confidence } = detectLanguage(message);
      detectedLanguage = language;

      logger.info(`언어 감지: ${language} (신뢰도: ${confidence})`);

      // 신규 대화 생성
      conversation = await prisma.conversation.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          language: detectedLanguage, // F-10: 감지된 언어 저장
        },
        include: { category: true },
      });
      logger.info(`신규 대화 생성: ${conversation.id} (언어: ${detectedLanguage})`);
    }

    // F-06: 사용자 명시적 상담원 요청 감지
    const agentKeywords = /상담원|사람|직원|담당자|연결|통화/i;
    let userRequestedAgent = false;
    if (agentKeywords.test(message)) {
      userRequestedAgent = true;
      logger.info(`사용자 명시적 상담원 요청 감지: ${conversation.id}`);
    }

    // 3. 사용자 메시지 저장
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.user,
        content: message,
      },
    });

    // F-04: conversation 메타데이터 업데이트
    try {
      await conversationService.updateConversationMetadata(conversation.id);
    } catch (error) {
      logger.error('메타데이터 업데이트 실패 (비동기 재시도 필요):', error);
      // 메시지 저장은 성공했으므로 계속 진행
    }

    // 4. 대화 이력 조회 (최근 5개 메시지, 현재 메시지 제외)
    const recentMessages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        id: { not: userMessage.id }, // 방금 저장한 메시지 제외
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        sender: true,
        content: true,
      },
    });

    // 시간순 정렬 (오래된 것부터)
    const conversationHistory = recentMessages
      .reverse()
      .map((msg) => ({
        role: msg.sender === MessageSender.user ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }))
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant'); // system 메시지 제외

    // 5. 템플릿 매칭 시도 (F-07, F-10: 언어 전달)
    const startTime = Date.now();
    const matchedTemplate = await templateService.matchTemplate(
      message,
      conversation.categoryId,
      detectedLanguage // F-10: 언어 전달
    );
    const matchTimeMs = Date.now() - startTime;

    let assistantContent: string;
    let needsEscalation = false;
    let assistantSender: MessageSender = MessageSender.assistant;
    let metadata: any;
    let responseTimeMs: number;

    if (matchedTemplate) {
      // 템플릿 매칭 성공 → AI 호출 생략
      assistantContent = matchedTemplate.answer;
      metadata = {
        source: 'template',
        templateId: matchedTemplate.templateId,
        matchScore: matchedTemplate.matchScore,
        matchTimeMs,
      };
      needsEscalation = false;
      responseTimeMs = matchTimeMs;

      logger.info(`템플릿 매칭 성공: ${matchedTemplate.templateId} (점수: ${matchedTemplate.matchScore})`);
    } else {
      // 템플릿 매칭 실패 → 기존 OpenAI API 호출 (폴백)
      try {
        // F-10: 언어에 맞는 카테고리 이름 선택
        const categoryName =
          detectedLanguage === 'en'
            ? conversation.category?.nameEn || conversation.category?.name
            : conversation.category?.nameKo || conversation.category?.name;

        const result = await generateAnswer(
          conversationHistory,
          message,
          categoryName,
          detectedLanguage // F-10: 언어 전달
        );

        assistantContent = result.content;
        needsEscalation = result.needsEscalation;
        responseTimeMs = Date.now() - startTime;

        // 분류 신뢰도가 낮은 경우 추가 에스컬레이션
        const confidenceThreshold = parseFloat(process.env.ESCALATION_CONFIDENCE_THRESHOLD || '0.5');
        if (
          conversation.classificationConfidence &&
          conversation.classificationConfidence.toNumber() < confidenceThreshold
        ) {
          needsEscalation = true;
        }

        metadata = {
          source: 'openai',
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          responseTimeMs,
          fallbackReason: '템플릿 매칭 실패',
        };
      } catch (error: any) {
        // AI 폴백 실패 시 시스템 메시지 (F-10: 언어별 메시지)
        logger.error('답변 생성 실패, 시스템 메시지 반환:', error.message);
        const { prompts } = require('../lib/prompts');
        assistantContent = prompts[detectedLanguage].fallback;
        needsEscalation = true;
        assistantSender = MessageSender.system;
        responseTimeMs = Date.now() - startTime;

        metadata = {
          source: 'system',
          error: error.message,
          responseTimeMs,
        };
      }
    }

    // 6. 답변 메시지 저장 (metadata 포함)
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: assistantSender,
        content: assistantContent,
        metadata, // F-07: 템플릿 매칭 정보 포함
      },
    });

    // F-04: conversation 메타데이터 업데이트
    try {
      await conversationService.updateConversationMetadata(conversation.id);
    } catch (error) {
      logger.error('메타데이터 업데이트 실패 (비동기 재시도 필요):', error);
      // 메시지 저장은 성공했으므로 계속 진행
    }

    // 7. Conversation 업데이트 (에스컬레이션 필요 시)
    let escalationReasonText = '';
    if (needsEscalation && !conversation.needsEscalation) {
      escalationReasonText = assistantSender === MessageSender.system
        ? 'AI 답변 생성 오류'
        : '답변 불가능 판단 (상담원 연결 필요)';

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          needsEscalation: true,
          escalationReason: escalationReasonText,
        },
      });
    } else if (userRequestedAgent && !conversation.needsEscalation) {
      // 사용자 명시적 요청
      escalationReasonText = '사용자 명시적 상담원 요청';
      needsEscalation = true;

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          needsEscalation: true,
          escalationReason: escalationReasonText,
        },
      });
    }

    // F-06: 에스컬레이션 생성
    if ((needsEscalation || userRequestedAgent) && escalationReasonText) {
      try {
        await escalationService.createEscalation({
          conversationId: conversation.id,
          reason: escalationReasonText,
        });
        logger.info(`에스컬레이션 자동 생성 (Chat): ${conversation.id}`);
      } catch (error: any) {
        // 중복 생성 에러는 무시 (409)
        if (error.statusCode !== 409) {
          logger.error('에스컬레이션 생성 실패:', error);
        }
      }
    }

    // 8. 결과 반환
    return {
      conversationId: conversation.id,
      language: detectedLanguage, // F-10: 대화 언어 포함
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        sender: userMessage.sender,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        sender: assistantMessage.sender,
        createdAt: assistantMessage.createdAt,
      },
      needsEscalation,
    };
  }
}
