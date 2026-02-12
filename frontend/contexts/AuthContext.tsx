'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  SessionRole,
  SignupRequest,
  LoginRequest,
  AuthState,
} from '@/types/auth';
import * as authApi from '@/lib/auth-api';
import * as tokenManager from '@/lib/token-manager';

// AuthContext 타입 정의
interface AuthContextType extends AuthState {
  signup: (data: SignupRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  createAnonymousSession: () => Promise<void>;
}

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider 컴포넌트
 * 전역 인증 상태 관리
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    sessionId: null,
    role: null,
    isLoading: true,
  });

  // 초기 로드 시 토큰 확인
  useEffect(() => {
    const initAuth = () => {
      const accessToken = tokenManager.getAccessToken();
      const anonymousToken = tokenManager.getAnonymousToken();
      const sessionId = tokenManager.getSessionId();

      if (accessToken) {
        // Access Token이 있으면 로그인 상태
        // JWT 디코딩하여 사용자 정보 추출 (간단한 방법)
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          setState({
            isAuthenticated: true,
            user: {
              id: payload.userId,
              email: payload.email,
              name: payload.name,
              role: payload.role,
            },
            sessionId: null,
            role: payload.role,
            isLoading: false,
          });
        } catch (error) {
          console.error('토큰 파싱 오류:', error);
          tokenManager.clearTokens();
          setState({
            isAuthenticated: false,
            user: null,
            sessionId: null,
            role: null,
            isLoading: false,
          });
        }
      } else if (anonymousToken && sessionId) {
        // Anonymous Token이 있으면 익명 상태
        setState({
          isAuthenticated: false,
          user: null,
          sessionId,
          role: 'anonymous',
          isLoading: false,
        });
      } else {
        // 토큰이 없으면 미인증 상태
        setState({
          isAuthenticated: false,
          user: null,
          sessionId: null,
          role: null,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  /**
   * 회원가입
   */
  const signup = async (data: SignupRequest) => {
    try {
      const response = await authApi.signup(data);
      tokenManager.setTokens(response.accessToken, response.refreshToken);

      setState({
        isAuthenticated: true,
        user: response.user,
        sessionId: null,
        role: response.user.role,
        isLoading: false,
      });
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw error;
    }
  };

  /**
   * 로그인
   */
  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);
      tokenManager.setTokens(response.accessToken, response.refreshToken);

      setState({
        isAuthenticated: true,
        user: response.user,
        sessionId: null,
        role: response.user.role,
        isLoading: false,
      });
    } catch (error) {
      console.error('로그인 오류:', error);
      throw error;
    }
  };

  /**
   * 로그아웃
   */
  const logout = async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      tokenManager.clearTokens();
      setState({
        isAuthenticated: false,
        user: null,
        sessionId: null,
        role: null,
        isLoading: false,
      });
    }
  };

  /**
   * 익명 세션 생성
   */
  const createAnonymousSession = async () => {
    try {
      const response = await authApi.createAnonymousSession();
      tokenManager.setAnonymousToken(response.anonymousToken, response.sessionId);

      setState({
        isAuthenticated: false,
        user: null,
        sessionId: response.sessionId,
        role: 'anonymous',
        isLoading: false,
      });
    } catch (error) {
      console.error('익명 세션 생성 오류:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signup,
        login,
        logout,
        createAnonymousSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth 훅
 * AuthContext를 사용하기 위한 커스텀 훅
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
}
