import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuth } from '../context/AuthContext';
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

    describe('畫面渲染', () => {
        it('應該正確渲染登入表單與相關元素', () => {
            renderComponent();

            expect(screen.getByRole('heading', { name: '歡迎回來' })).toBeInTheDocument();
            expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
            expect(screen.getByLabelText('密碼')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
        });
    });

    describe('表單驗證', () => {
        it('輸入無效的 Email 格式時應顯示錯誤訊息', async () => {
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
            fireEvent.change(passwordInput, { target: { value: 'Valid123' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('請輸入有效的 Email 格式')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('輸入長度不足的密碼時應顯示錯誤訊息', async () => {
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'Short1!' } });
            fireEvent.click(submitButton);

            expect(await screen.findByText('密碼必須至少 8 個字元')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('輸入未包含大小寫與數字的密碼時應顯示錯誤訊息', async () => {
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            
            // Only lowercase
            fireEvent.change(passwordInput, { target: { value: 'alllowercase123' } });
            fireEvent.click(submitButton);
            expect(await screen.findByText('密碼必須包含大小寫英文字母和數字')).toBeInTheDocument();

            // Only uppercase
            fireEvent.change(passwordInput, { target: { value: 'ALLUPPERCASE123' } });
            fireEvent.click(submitButton);
            expect(await screen.findByText('密碼必須包含大小寫英文字母和數字')).toBeInTheDocument();

            expect(mockLogin).not.toHaveBeenCalled();
        });
    });

    describe('登入邏輯', () => {
        it('API 回傳錯誤時應顯示錯誤提示', async () => {
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
        });

        it('登入成功後應導向至 Dashboard', async () => {
            mockLogin.mockResolvedValueOnce(undefined);

            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'Valid123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });
    });

    describe('狀態處理', () => {
        it('提交表單時按鈕應顯示載入中狀態並禁用', async () => {
            // Mock login to succeed with a slight delay
            let resolveLogin: any;
            mockLogin.mockImplementationOnce(() => new Promise((resolve) => {
                resolveLogin = resolve;
            }));

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
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();

            resolveLogin();

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });

        it('若有 authExpiredMessage 應顯示並清除狀態', () => {
            (useAuth as any).mockReturnValue({
                login: mockLogin,
                isAuthenticated: false,
                authExpiredMessage: '登入已過期',
                clearAuthExpiredMessage: mockClearAuthExpiredMessage,
            });

            renderComponent();

            expect(screen.getByText('登入已過期')).toBeInTheDocument();
            expect(mockClearAuthExpiredMessage).toHaveBeenCalled();
        });
    });

    describe('已登入狀態', () => {
        it('若使用者已認證應自動導向至 Dashboard', () => {
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
});
