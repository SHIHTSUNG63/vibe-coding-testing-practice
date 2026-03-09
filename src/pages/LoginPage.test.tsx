import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockLogin = vi.fn();
const mockClearAuthExpiredMessage = vi.fn();

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      login: mockLogin,
      isAuthenticated: false,
      authExpiredMessage: '',
      clearAuthExpiredMessage: mockClearAuthExpiredMessage,
    })),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup: not authenticated, no expired message
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      authExpiredMessage: '',
      clearAuthExpiredMessage: mockClearAuthExpiredMessage,
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  };

  describe('前端元素', () => {
    it('畫面正常渲染登入表單', () => {
      renderComponent();
      
      expect(screen.getByRole('heading', { name: '歡迎回來' })).toBeInTheDocument();
      expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
      expect(screen.getByLabelText('密碼')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
    });
  });

  describe('前端驗證', () => {
    it('無效的 Email 格式', async () => {
      renderComponent();
      
      const emailInput = screen.getByLabelText('電子郵件');
      const passwordInput = screen.getByLabelText('密碼');
      const submitButton = screen.getByRole('button', { name: '登入' });

      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.change(passwordInput, { target: { value: 'Valid123' } });
      fireEvent.click(submitButton);

      expect(await screen.findByText('請輸入有效的 Email 格式')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('密碼長度不足 8 碼', async () => {
      renderComponent();
      
      const emailInput = screen.getByLabelText('電子郵件');
      const passwordInput = screen.getByLabelText('密碼');
      const submitButton = screen.getByRole('button', { name: '登入' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'a1' } });
      fireEvent.click(submitButton);

      expect(await screen.findByText('密碼必須至少 8 個字元')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('密碼未包含英數混合', async () => {
      renderComponent();
      
      const emailInput = screen.getByLabelText('電子郵件');
      const passwordInput = screen.getByLabelText('密碼');
      const submitButton = screen.getByRole('button', { name: '登入' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '12345678' } });
      fireEvent.click(submitButton);

      expect(await screen.findByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Mock API', () => {
    it('登入成功時顯示載入中並導向', async () => {
      // Mock login to succeed with a slight delay
      mockLogin.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));
      
      renderComponent();

      const emailInput = screen.getByLabelText('電子郵件');
      const passwordInput = screen.getByLabelText('密碼');
      const submitButton = screen.getByRole('button', { name: '登入' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Valid123' } });
      fireEvent.click(submitButton);

      // Loading state
      expect(submitButton).toHaveTextContent('登入中...');
      expect(submitButton).toBeDisabled();

      // Wait for navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
      
      // Button should be restored after unmount/finish
      await waitFor(() => {
          expect(submitButton).toHaveTextContent('登入');
      })
    });

    it('登入失敗時顯示後端自訂錯誤訊息', async () => {
      mockLogin.mockRejectedValueOnce({
        response: {
          data: {
            message: '帳號或密碼錯誤',
          },
        },
      });

      renderComponent();

      const emailInput = screen.getByLabelText('電子郵件');
      const passwordInput = screen.getByLabelText('密碼');
      const submitButton = screen.getByRole('button', { name: '登入' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Valid123' } });
      fireEvent.click(submitButton);

      expect(await screen.findByText('帳號或密碼錯誤')).toBeInTheDocument();
      expect(submitButton).toHaveTextContent('登入');
      expect(submitButton).not.toBeDisabled();
    });

    it('登入失敗且後端未提供訊息時的預設錯誤', async () => {
      // Simulate generic 500 error or network error without message
      mockLogin.mockRejectedValueOnce(new Error('Network Error'));

      renderComponent();

      const emailInput = screen.getByLabelText('電子郵件');
      const passwordInput = screen.getByLabelText('密碼');
      const submitButton = screen.getByRole('button', { name: '登入' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Valid123' } });
      fireEvent.click(submitButton);

      expect(await screen.findByText('登入失敗，請稍後再試')).toBeInTheDocument();
    });
  });

  describe('路由導向', () => {
    it('若已登入則自動導回控制台', () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isAuthenticated: true,
        authExpiredMessage: '',
        clearAuthExpiredMessage: mockClearAuthExpiredMessage,
      });

      renderComponent();

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  describe('全域狀態', () => {
    it('顯示登入過期的快顯訊息', () => {
      (useAuth as any).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        authExpiredMessage: '您的登入已過期',
        clearAuthExpiredMessage: mockClearAuthExpiredMessage,
      });

      renderComponent();

      expect(screen.getByText('您的登入已過期')).toBeInTheDocument();
      expect(mockClearAuthExpiredMessage).toHaveBeenCalled();
    });
  });
});
