// 다국어 지원 E2E 테스트
// F-10 다국어 지원
import { test, expect, Page } from '@playwright/test';

test.describe('Multilingual Support (F-10 다국어 지원)', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // 앱 로드
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('언어 토글 UI', () => {
    test('언어 토글 버튼이 표시된다', async () => {
      // 채팅 페이지 진입
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어 토글 버튼 확인
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await expect(languageToggle).toBeVisible();
    });

    test('언어 토글 버튼에 현재 언어가 표시된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 초기 언어는 한국어
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await expect(languageToggle).toContainText(/KO|ko/);
    });

    test('UI 텍스트가 한국어로 표시된다 (초기값)', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 한국어 UI 텍스트 확인
      const inputPlaceholder = page.locator('[data-testid="message-input"]');
      await expect(inputPlaceholder).toHaveAttribute('placeholder', /메시지|입력/);

      const sendButton = page.locator('[data-testid="send-button"]');
      await expect(sendButton).toContainText(/전송/);
    });
  });

  test.describe('언어 전환 (KO → EN)', () => {
    test('언어 토글 클릭 시 언어가 영어로 변경된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어 토글 클릭
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 언어 변경 확인
      const languageDisplay = page.locator('[data-testid="current-language"]');
      await expect(languageDisplay).toContainText(/EN|en/);
    });

    test('언어를 영어로 변경하면 UI 텍스트가 영어로 변경된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어 토글 클릭하여 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 영어 UI 텍스트 확인
      const inputPlaceholder = page.locator('[data-testid="message-input"]');
      await expect(inputPlaceholder).toHaveAttribute('placeholder', /[Ee]nter/);

      const sendButton = page.locator('[data-testid="send-button"]');
      await expect(sendButton).toContainText(/[Ss]end/);
    });

    test('언어 변경 후 로딩 메시지가 변경된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 한국어 메시지 입력
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('배송은 얼마나 걸리나요?');
      await page.click('[data-testid="send-button"]');

      // 로딩 상태에서 한국어 메시지 확인
      let loadingMessage = page.locator('[data-testid="loading-message"]');
      await expect(loadingMessage).toContainText(/생성|답변/);

      // 응답 대기
      await page.waitForTimeout(2000);

      // 언어 토글 클릭
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 다음 메시지 입력 시 로딩 메시지가 영어로 표시되는지 확인
      await messageInput.fill('What about returns?');
      await page.click('[data-testid="send-button"]');

      loadingMessage = page.locator('[data-testid="loading-message"]');
      await expect(loadingMessage).toContainText(/[Gg]enerating|response/);
    });

    test('언어 변경 후 새 메시지 전송 시 영어 답변이 생성된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어 토글 클릭하여 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 영어 메시지 입력
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('How long does shipping take?');
      await page.click('[data-testid="send-button"]');

      // 영어 답변 대기
      const assistantMessage = page.locator('[data-testid="assistant-message"]:last-child');
      await expect(assistantMessage).toBeVisible({ timeout: 5000 });

      // 영어 답변 확인 (단어 확인)
      const messageText = await assistantMessage.textContent();
      expect(messageText).toMatch(/[Dd]ays|[Hh]ours|[Ss]hipping/i);
    });
  });

  test.describe('언어 전환 (EN → KO)', () => {
    test('영어에서 한국어로 언어를 전환할 수 있다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 한국어로 다시 변경
      await languageToggle.click();

      // 한국어로 변경되었는지 확인
      const languageDisplay = page.locator('[data-testid="current-language"]');
      await expect(languageDisplay).toContainText(/KO|ko/);
    });

    test('영어에서 한국어로 변경 후 한국어 UI가 표시된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 영어로 변경 후 한국어로 다시 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();
      await languageToggle.click();

      // 한국어 UI 텍스트 확인
      const inputPlaceholder = page.locator('[data-testid="message-input"]');
      await expect(inputPlaceholder).toHaveAttribute('placeholder', /메시지|입력/);
    });
  });

  test.describe('언어 자동 감지', () => {
    test('한국어로 처음 메시지를 입력하면 한국어 답변을 받는다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 새 대화 시작 (언어 토글이 기본 한국어 상태)
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('배송은 얼마나 걸리나요?');
      await page.click('[data-testid="send-button"]');

      // 한국어 답변 대기
      const assistantMessage = page.locator('[data-testid="assistant-message"]:last-child');
      await expect(assistantMessage).toBeVisible({ timeout: 5000 });

      // 한국어 답변 확인 (한글 단어 포함)
      const messageText = await assistantMessage.textContent();
      expect(messageText).toMatch(/일|기간|배송|소요/);
    });

    test('영어로 처음 메시지를 입력하면 영어 답변을 받는다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어를 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 영어 메시지 입력
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('How long does shipping take?');
      await page.click('[data-testid="send-button"]');

      // 영어 답변 대기
      const assistantMessage = page.locator('[data-testid="assistant-message"]:last-child');
      await expect(assistantMessage).toBeVisible({ timeout: 5000 });

      // 영어 답변 확인
      const messageText = await assistantMessage.textContent();
      expect(messageText).toMatch(/[Dd]ays|[Hh]ours|shipping|time/i);
    });
  });

  test.describe('localStorage 언어 유지', () => {
    test('브라우저 새로고침 후에도 선택한 언어가 유지된다', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어를 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 언어가 영어로 변경되었는지 확인
      let languageDisplay = page.locator('[data-testid="current-language"]');
      await expect(languageDisplay).toContainText(/EN|en/);

      // 페이지 새로고침
      await page.reload({ waitUntil: 'networkidle' });

      // 언어가 여전히 영어인지 확인
      languageDisplay = page.locator('[data-testid="current-language"]');
      await expect(languageDisplay).toContainText(/EN|en/);
    });

    test('localStorage에 언어 설정이 저장된다', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어를 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // localStorage 확인
      const language = await page.evaluate(() => {
        return localStorage.getItem('language') || localStorage.getItem('preferred-language');
      });

      expect(language).toBe('en');
    });

    test('여러 번 언어 전환 후 최종 선택 언어가 유지된다', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      const languageToggle = page.locator('[data-testid="language-toggle"]');

      // 한국어 → 영어
      await languageToggle.click();
      // 영어 → 한국어
      await languageToggle.click();
      // 한국어 → 영어
      await languageToggle.click();

      // 최종 언어가 영어인지 확인
      const languageDisplay = page.locator('[data-testid="current-language"]');
      await expect(languageDisplay).toContainText(/EN|en/);

      // 새로고침 후에도 유지
      await page.reload({ waitUntil: 'networkidle' });

      await expect(languageDisplay).toContainText(/EN|en/);
    });
  });

  test.describe('언어 변경 후 대화 이력', () => {
    test('언어 변경 후에도 기존 메시지 이력이 보존된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 한국어로 메시지 입력
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('배송은 얼마나 걸리나요?');
      await page.click('[data-testid="send-button"]');

      // 답변 대기
      await page.waitForTimeout(2000);

      // 메시지 확인
      let userMessage = page.locator('[data-testid="user-message"]:last-child');
      await expect(userMessage).toContainText('배송');

      // 언어 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 기존 메시지가 여전히 보이는지 확인
      userMessage = page.locator('[data-testid="user-message"]:last-child');
      await expect(userMessage).toContainText('배송');
    });

    test('기존 메시지는 번역되지 않고 원본 언어로 유지된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 한국어로 메시지 입력
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('배송은 얼마나 걸리나요?');
      await page.click('[data-testid="send-button"]');

      await page.waitForTimeout(2000);

      // 메시지 텍스트 저장
      const userMessageBefore = await page.locator('[data-testid="user-message"]:last-child').textContent();

      // 언어를 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 메시지가 동일한지 확인 (번역되지 않음)
      const userMessageAfter = await page.locator('[data-testid="user-message"]:last-child').textContent();
      expect(userMessageBefore).toBe(userMessageAfter);
      expect(userMessageAfter).toContain('배송');
    });
  });

  test.describe('카테고리 다국어 표시', () => {
    test('한국어 모드에서 카테고리가 한국어로 표시된다', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // 카테고리 목록 페이지 진입 (있다면)
      const categoryLink = page.locator('[data-testid="category-link"]');
      if (await categoryLink.isVisible()) {
        await categoryLink.click();
        await page.waitForLoadState('networkidle');

        // 한국어 카테고리 확인
        const categories = page.locator('[data-testid="category-item"]');
        const categoryText = await categories.first().textContent();
        expect(categoryText).toMatch(/상품|배송|반품|결제|기타/);
      }
    });

    test('영어 모드에서 카테고리가 영어로 표시된다', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어를 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 카테고리 목록 페이지 진입 (있다면)
      const categoryLink = page.locator('[data-testid="category-link"]');
      if (await categoryLink.isVisible()) {
        await categoryLink.click();
        await page.waitForLoadState('networkidle');

        // 영어 카테고리 확인
        const categories = page.locator('[data-testid="category-item"]');
        const categoryText = await categories.first().textContent();
        expect(categoryText).toMatch(/[Pp]roduct|[Ss]hipping|[Rr]eturn|[Pp]ayment|[Oo]ther/i);
      }
    });
  });

  test.describe('에러 메시지 다국어 표시', () => {
    test('한국어 모드에서 에러 메시지가 한국어로 표시된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 빈 메시지 전송 시도 (에러 발생)
      const sendButton = page.locator('[data-testid="send-button"]');
      await sendButton.click();

      // 한국어 에러 메시지 확인
      const errorMessage = page.locator('[data-testid="error-message"]');
      const errorText = await errorMessage.textContent();
      expect(errorText).toMatch(/메시지|입력|필수/);
    });

    test('영어 모드에서 에러 메시지가 영어로 표시된다', async () => {
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어를 영어로 변경
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await languageToggle.click();

      // 빈 메시지 전송 시도 (에러 발생)
      const sendButton = page.locator('[data-testid="send-button"]');
      await sendButton.click();

      // 영어 에러 메시지 확인
      const errorMessage = page.locator('[data-testid="error-message"]');
      const errorText = await errorMessage.textContent();
      expect(errorText).toMatch(/[Mm]essage|[Ee]nter|[Rr]equired/i);
    });
  });

  test.describe('반응형 UI', () => {
    test('모바일 화면에서도 언어 토글이 표시된다', async () => {
      // 모바일 뷰포트 설정
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어 토글 확인
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await expect(languageToggle).toBeVisible();

      // 클릭 가능한지 확인
      await languageToggle.click();
      const languageDisplay = page.locator('[data-testid="current-language"]');
      await expect(languageDisplay).toContainText(/EN|en/);
    });

    test('태블릿 화면에서도 언어 토글이 작동한다', async () => {
      // 태블릿 뷰포트 설정
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.click('[data-testid="chat-link"]');
      await page.waitForLoadState('networkidle');

      // 언어 토글 확인
      const languageToggle = page.locator('[data-testid="language-toggle"]');
      await expect(languageToggle).toBeVisible();
      await languageToggle.click();

      const languageDisplay = page.locator('[data-testid="current-language"]');
      await expect(languageDisplay).toContainText(/EN|en/);
    });
  });
});
