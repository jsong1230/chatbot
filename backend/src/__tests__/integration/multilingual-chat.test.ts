// 다국어 채팅 통합 테스트
// F-10 다국어 지원
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Prisma 모킹
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => ({
      conversation: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      message: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      category: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    })),
    MessageSender: {
      user: 'user',
      assistant: 'assistant',
    },
  };
});

// Prisma 클라이언트 모킹
vi.mock('../../lib/prisma.client', () => {
  const mockClient = {
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return {
    prisma: mockClient,
    getPrismaClient: vi.fn(() => mockClient),
  };
});

// OpenAI 서비스 모킹
vi.mock('../../services/openai.service', () => ({
  generateAnswer: vi.fn(),
}));

// ConversationService 모킹
vi.mock('../../services/conversation.service', () => ({
  ConversationService: vi.fn().mockImplementation(() => ({
    updateConversationMetadata: vi.fn().mockResolvedValue(undefined),
  })),
}));

// EscalationService 모킹
vi.mock('../../services/escalation.service', () => ({
  EscalationService: vi.fn().mockImplementation(() => ({
    createEscalation: vi.fn().mockResolvedValue({
      id: 'esc-1',
      conversationId: 'conv-1',
      reason: 'test',
      status: 'pending',
    }),
  })),
}));

// TemplateService 모킹
vi.mock('../../services/template.service', () => ({
  TemplateService: vi.fn().mockImplementation(() => ({
    matchTemplate: vi.fn().mockResolvedValue(null),
  })),
}));

import { ChatService } from '../../services/chat.service';
import * as openaiService from '../../services/openai.service';
import * as prismaClient from '../../lib/prisma.client';

const mockPrisma = (prismaClient as any).prisma;
const mockGenerateAnswer = vi.mocked(openaiService.generateAnswer);

describe('Multilingual Chat Integration (F-10 다국어 채팅)', () => {
  let chatService: ChatService;

  const mockCategory = {
    id: 'cat-shipping',
    name: '배송문의',
    name_ko: '배송문의',
    name_en: 'Shipping Inquiry',
    slug: 'shipping',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    chatService = new ChatService();

    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.OPENAI_MODEL = 'gpt-3.5-turbo';

    // generateAnswer 모킹 설정
    mockGenerateAnswer.mockImplementation(async (history, message, category, language = 'ko') => {
      let responseText = '';
      if (language === 'en') {
        responseText = 'Shipping typically takes 2-3 business days.';
      } else {
        responseText = '배송은 통상 2~3일 정도 소요됩니다.';
      }

      return {
        content: responseText,
        needsEscalation: false,
      };
    });
  });

  describe('신규 대화 - 한국어 자동 감지', () => {
    it('한국어 메시지로 신규 대화를 시작하면 언어가 ko로 감지되고 저장된다', async () => {
      // Arrange
      const userMessage = '배송은 얼마나 걸리나요?';
      const conversationId = 'conv-ko-1';
      const userId = 'user-1';

      const mockConversation = {
        id: conversationId,
        userId,
        sessionId: null,
        language: 'ko', // 감지된 언어
        categoryId: mockCategory.id,
        classificationConfidence: { toNumber: () => 0.95 },
        classificationReason: '배송문의',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: mockCategory,
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-1',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          conversationId,
          content: userMessage,
          sender: 'user',
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId: null, // 신규 대화
        message: userMessage,
        userId,
      });

      // Assert
      expect(result.language).toBe('ko');
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            language: 'ko',
          }),
        })
      );
    });

    it('한국어 메시지로 신규 대화 시 한국어 답변이 생성된다', async () => {
      // Arrange
      const userMessage = '상품의 색상은 어떻게 되나요?';
      const conversationId = 'conv-ko-2';
      const userId = 'user-2';
      const koreanResponse = '배송은 통상 2~3일 정도 소요됩니다.';

      const mockConversation = {
        id: conversationId,
        userId,
        sessionId: null,
        language: 'ko',
        categoryId: mockCategory.id,
        classificationConfidence: { toNumber: () => 0.92 },
        classificationReason: '상품문의',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: { ...mockCategory, name_ko: '상품문의', name_en: 'Product Inquiry' },
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockImplementation(async (args) => ({
        id: args.data.sender === 'user' ? 'msg-user-1' : 'msg-asst-1',
        conversationId,
        content: args.data.content,
        sender: args.data.sender,
        createdAt: new Date(),
      }));
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // 한국어 응답 반환하도록 설정
      mockGenerateAnswer.mockResolvedValueOnce({
        content: koreanResponse,
        needsEscalation: false,
      });

      // Act
      const result = await chatService.processMessage({
        conversationId: null,
        message: userMessage,
        userId,
      });

      // Assert
      // 한국어 답변이 생성되는지 확인
      expect(result.language).toBe('ko');
      // 한국어로 generateAnswer가 호출되었는지 확인
      expect(mockGenerateAnswer).toHaveBeenCalledWith(
        expect.any(Array),
        userMessage,
        expect.any(String),
        'ko' // 한국어 파라미터 전달
      );
    });
  });

  describe('신규 대화 - 영어 자동 감지', () => {
    it('영어 메시지로 신규 대화를 시작하면 언어가 en으로 감지되고 저장된다', async () => {
      // Arrange
      const userMessage = 'How long does shipping take?';
      const conversationId = 'conv-en-1';
      const userId = 'user-3';

      const mockConversation = {
        id: conversationId,
        userId,
        sessionId: null,
        language: 'en', // 감지된 언어
        categoryId: 'cat-shipping',
        classificationConfidence: { toNumber: () => 0.96 },
        classificationReason: 'Shipping Inquiry',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: { ...mockCategory, name: 'Shipping Inquiry' },
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-2',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-2', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId: null,
        message: userMessage,
        userId,
      });

      // Assert
      expect(result.language).toBe('en');
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            language: 'en',
          }),
        })
      );
    });

    it('영어 메시지로 신규 대화 시 영어 답변이 생성된다', async () => {
      // Arrange
      const userMessage = 'What is the refund policy?';
      const conversationId = 'conv-en-2';
      const userId = 'user-4';
      const englishResponse = 'Shipping typically takes 2-3 business days.';

      const mockConversation = {
        id: conversationId,
        userId,
        sessionId: null,
        language: 'en',
        categoryId: 'cat-return',
        classificationConfidence: { toNumber: () => 0.91 },
        classificationReason: 'Return/Exchange',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: { ...mockCategory, name_en: 'Return/Exchange' },
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockImplementation(async (args) => ({
        id: args.data.sender === 'user' ? 'msg-user-2' : 'msg-asst-2',
        conversationId,
        content: args.data.content,
        sender: args.data.sender,
        createdAt: new Date(),
      }));
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-3', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // 영어 응답 반환하도록 설정
      mockGenerateAnswer.mockResolvedValueOnce({
        content: englishResponse,
        needsEscalation: false,
      });

      // Act
      const result = await chatService.processMessage({
        conversationId: null,
        message: userMessage,
        userId,
      });

      // Assert
      // 영어 답변이 생성되는지 확인
      expect(result.language).toBe('en');
      // 영어로 generateAnswer가 호출되었는지 확인
      expect(mockGenerateAnswer).toHaveBeenCalledWith(
        expect.any(Array),
        userMessage,
        expect.any(String),
        'en' // 영어 파라미터 전달
      );
    });
  });

  describe('기존 대화 계속 (언어 재감지 없음)', () => {
    it('기존 대화의 언어를 유지하고 재감지하지 않는다', async () => {
      // Arrange
      const conversationId = 'conv-en-3';
      const existingLanguage = 'en';
      const userMessage = 'What about returns?'; // 영어로 계속

      const mockConversation = {
        id: conversationId,
        userId: 'user-5',
        sessionId: null,
        language: existingLanguage, // 기존 언어 유지
        categoryId: 'cat-shipping',
        classificationConfidence: { toNumber: () => 0.94 },
        classificationReason: 'Shipping Inquiry',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: mockCategory,
      };

      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-4',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', conversationId, content: 'How long does shipping take?', sender: 'user', createdAt: new Date() },
        { id: 'msg-2', conversationId, content: '2-3 business days', sender: 'assistant', createdAt: new Date() },
        { id: 'msg-4', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId,
        message: userMessage,
        userId: 'user-5',
      });

      // Assert
      expect(result.language).toBe('en'); // 기존 언어 유지
      expect(mockGenerateAnswer).toHaveBeenCalledWith(
        expect.any(Array),
        userMessage,
        expect.any(String),
        'en' // 기존 언어로 답변 생성
      );
    });

    it('영어 대화에서 한국어 메시지가 들어와도 영어로 답변한다', async () => {
      // Arrange
      const conversationId = 'conv-en-4';
      const existingLanguage = 'en';
      const userMessage = '배송 기간을 다시 알려줘'; // 한국어로 물어봤지만

      const mockConversation = {
        id: conversationId,
        userId: 'user-6',
        sessionId: null,
        language: existingLanguage, // 기존 언어는 영어
        categoryId: 'cat-shipping',
        classificationConfidence: { toNumber: () => 0.93 },
        classificationReason: 'Shipping Inquiry',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: mockCategory,
      };

      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-5',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-1', conversationId, content: 'How long does shipping take?', sender: 'user', createdAt: new Date() },
        { id: 'msg-2', conversationId, content: '2-3 business days', sender: 'assistant', createdAt: new Date() },
        { id: 'msg-5', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId,
        message: userMessage,
        userId: 'user-6',
      });

      // Assert
      expect(result.language).toBe('en'); // 여전히 영어
      expect(mockGenerateAnswer).toHaveBeenCalledWith(
        expect.any(Array),
        userMessage,
        expect.any(String),
        'en' // 영어로 답변 생성 (재감지 안 함)
      );
    });
  });

  describe('응답에 language 필드 포함', () => {
    it('신규 대화 응답에 language 필드가 포함된다', async () => {
      // Arrange
      const userMessage = '배송은 얼마나 걸리나요?';
      const conversationId = 'conv-ko-3';

      const mockConversation = {
        id: conversationId,
        userId: 'user-7',
        sessionId: null,
        language: 'ko',
        categoryId: mockCategory.id,
        classificationConfidence: { toNumber: () => 0.95 },
        classificationReason: '배송문의',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: mockCategory,
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-6',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-6', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId: null,
        message: userMessage,
        userId: 'user-7',
      });

      // Assert
      expect(result).toHaveProperty('language');
      expect(result.language).toBe('ko');
    });

    it('기존 대화 응답에 language 필드가 포함된다', async () => {
      // Arrange
      const conversationId = 'conv-en-5';
      const userMessage = 'Can I cancel my order?';

      const mockConversation = {
        id: conversationId,
        userId: 'user-8',
        sessionId: null,
        language: 'en',
        categoryId: 'cat-other',
        classificationConfidence: { toNumber: () => 0.88 },
        classificationReason: 'Other',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: mockCategory,
      };

      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-7',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-7', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId,
        message: userMessage,
        userId: 'user-8',
      });

      // Assert
      expect(result).toHaveProperty('language');
      expect(result.language).toBe('en');
    });
  });

  describe('카테고리 이름 다국어화', () => {
    it('한국어 대화에서 카테고리 이름을 한국어로 반환한다', async () => {
      // Arrange
      const userMessage = '배송은 얼마나 걸리나요?';
      const conversationId = 'conv-ko-4';

      const mockConversation = {
        id: conversationId,
        userId: 'user-9',
        sessionId: null,
        language: 'ko',
        categoryId: mockCategory.id,
        classificationConfidence: { toNumber: () => 0.95 },
        classificationReason: '배송문의',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: { ...mockCategory, name: '배송문의' },
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-8',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-8', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId: null,
        message: userMessage,
        userId: 'user-9',
      });

      // Assert
      expect(mockGenerateAnswer).toHaveBeenCalledWith(
        expect.any(Array),
        userMessage,
        '배송문의', // 한국어 카테고리 이름
        'ko'
      );
    });

    it('영어 대화에서 카테고리 이름을 영어로 반환한다', async () => {
      // Arrange
      const userMessage = 'How do I return this item?';
      const conversationId = 'conv-en-6';

      const mockConversation = {
        id: conversationId,
        userId: 'user-10',
        sessionId: null,
        language: 'en',
        categoryId: 'cat-return',
        classificationConfidence: { toNumber: () => 0.93 },
        classificationReason: 'Return/Exchange',
        needsEscalation: false,
        escalationReason: null,
        classifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: { ...mockCategory, name: 'Return/Exchange', name_en: 'Return/Exchange' },
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-9',
        conversationId,
        content: userMessage,
        sender: 'user',
        createdAt: new Date(),
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 'msg-9', conversationId, content: userMessage, sender: 'user', createdAt: new Date() },
      ]);

      // Act
      const result = await chatService.processMessage({
        conversationId: null,
        message: userMessage,
        userId: 'user-10',
      });

      // Assert
      expect(mockGenerateAnswer).toHaveBeenCalledWith(
        expect.any(Array),
        userMessage,
        'Return/Exchange', // 영어 카테고리 이름
        'en'
      );
    });
  });
});
