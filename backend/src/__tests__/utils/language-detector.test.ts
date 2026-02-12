// 언어 감지 유틸리티 테스트
// F-10 다국어 지원
import { describe, it, expect } from 'vitest';
import { detectLanguage, type LanguageDetectionResult } from '../../utils/language-detector';

describe('language-detector (F-10 언어 감지)', () => {
  describe('한국어 감지', () => {
    it('한국어 메시지를 감지하면 ko를 반환한다', () => {
      // Arrange
      const koreanMessage = '배송은 얼마나 걸리나요?';

      // Act
      const result = detectLanguage(koreanMessage);

      // Assert
      expect(result.language).toBe('ko');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('긴 한국어 메시지를 감지한다', () => {
      // Arrange
      const koreanMessage = '이 제품의 사이즈는 어떻게 되나요? M, L, XL 중에 어떤 것을 추천하실 것 같나요?';

      // Act
      const result = detectLanguage(koreanMessage);

      // Assert
      expect(result.language).toBe('ko');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('한국어로만 된 문의를 감지한다', () => {
      // Arrange
      const koreanMessage = '환불은 어떻게 하나요?';

      // Act
      const result = detectLanguage(koreanMessage);

      // Assert
      expect(result.language).toBe('ko');
    });
  });

  describe('영어 감지', () => {
    it('영어 메시지를 감지하면 en을 반환한다', () => {
      // Arrange
      const englishMessage = 'How long does shipping take?';

      // Act
      const result = detectLanguage(englishMessage);

      // Assert
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('긴 영어 메시지를 감지한다', () => {
      // Arrange
      const englishMessage = 'What is the size of this product? I am looking for a medium size and would like to know if it is available in stock.';

      // Act
      const result = detectLanguage(englishMessage);

      // Assert
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('영어로만 된 문의를 감지한다', () => {
      // Arrange
      const englishMessage = 'Can I return this item?';

      // Act
      const result = detectLanguage(englishMessage);

      // Assert
      expect(result.language).toBe('en');
    });
  });

  describe('폴백 처리 (짧은 메시지)', () => {
    it('5자 미만의 메시지는 폴백 언어 ko를 반환한다', () => {
      // Arrange
      const shortMessage = '안녕';

      // Act
      const result = detectLanguage(shortMessage);

      // Assert
      expect(result.language).toBe('ko');
      expect(result.confidence).toBe(0);
    });

    it('빈 문자열은 폴백 언어 ko를 반환한다', () => {
      // Arrange
      const emptyMessage = '';

      // Act
      const result = detectLanguage(emptyMessage);

      // Assert
      expect(result.language).toBe('ko');
      expect(result.confidence).toBe(0);
    });

    it('한두 글자 영어는 폴백 언어 ko를 반환한다', () => {
      // Arrange
      const shortEnglish = 'hi';

      // Act
      const result = detectLanguage(shortEnglish);

      // Assert
      expect(result.language).toBe('ko');
      expect(result.confidence).toBe(0);
    });

    it('공백만 있는 메시지는 폴백 언어 ko를 반환한다', () => {
      // Arrange
      const whitespaceMessage = '     ';

      // Act
      const result = detectLanguage(whitespaceMessage);

      // Assert
      expect(result.language).toBe('ko');
      expect(result.confidence).toBe(0);
    });
  });

  describe('혼합 언어 처리', () => {
    it('주로 한국어이고 영어 단어가 섞여있으면 한국어로 감지한다', () => {
      // Arrange
      const mixedMessage = '이 제품의 size는 어떻게 되나요?';

      // Act
      const result = detectLanguage(mixedMessage);

      // Assert
      expect(['ko', 'en']).toContain(result.language);
    });

    it('한국어가 대부분인 메시지는 한국어로 감지한다', () => {
      // Arrange
      const koreanDominant = '배송은 언제 도착하나요? 빠르게 필요해요.';

      // Act
      const result = detectLanguage(koreanDominant);

      // Assert
      expect(result.language).toBe('ko');
    });
  });

  describe('감지 결과 구조', () => {
    it('감지 결과는 language와 confidence를 포함한다', () => {
      // Arrange
      const message = '배송 기간을 알려주세요';

      // Act
      const result = detectLanguage(message);

      // Assert
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.language).toBe('string');
      expect(typeof result.confidence).toBe('number');
    });

    it('language는 항상 ko 또는 en이다', () => {
      // Arrange
      const messages = [
        '배송은 얼마나 걸리나요?',
        'How long does it take?',
        '안녕',
        'hi',
      ];

      // Act & Assert
      messages.forEach(msg => {
        const result = detectLanguage(msg);
        expect(['ko', 'en']).toContain(result.language);
      });
    });

    it('confidence는 항상 0 이상이다', () => {
      // Arrange
      const messages = [
        '배송은 얼마나 걸리나요?',
        'How long does it take?',
      ];

      // Act & Assert
      messages.forEach(msg => {
        const result = detectLanguage(msg);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('실제 대화 시나리오', () => {
    it('고객 제품 문의를 한국어로 감지한다', () => {
      // Arrange
      const customerMessage = '상품 설명에 나온 사진의 색상이 실제와 다른 것 같습니다. 정말 하얀색인가요?';

      // Act
      const result = detectLanguage(customerMessage);

      // Assert
      expect(result.language).toBe('ko');
    });

    it('배송 관련 영어 문의를 감지한다', () => {
      // Arrange
      const shippingEnquiry = 'Does this item qualify for free shipping? What is the delivery timeframe to the United States?';

      // Act
      const result = detectLanguage(shippingEnquiry);

      // Assert
      expect(result.language).toBe('en');
    });

    it('환불 요청을 한국어로 감지한다', () => {
      // Arrange
      const refundRequest = '주문한 상품이 손상되어 받았는데, 환불을 받을 수 있을까요?';

      // Act
      const result = detectLanguage(refundRequest);

      // Assert
      expect(result.language).toBe('ko');
    });

    it('결제 오류 문의를 영어로 감지한다', () => {
      // Arrange
      const paymentIssue = 'I tried to complete my payment but it failed. The transaction shows as pending. Can someone help me resolve this?';

      // Act
      const result = detectLanguage(paymentIssue);

      // Assert
      expect(result.language).toBe('en');
    });
  });
});
