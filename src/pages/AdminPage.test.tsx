import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AdminPage } from './AdminPage';
import { useAuth } from '../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock AuthContext
const mockLogout = vi.fn();

vi.mock('../context/AuthContext', async () => {
    const actual = await vi.importActual('../context/AuthContext');
    return {
        ...actual,
        useAuth: vi.fn(),
    };
});

describe('AdminPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default AuthContext mock setup
        (useAuth as any).mockReturnValue({
            user: { role: 'admin' },
            logout: mockLogout,
        });
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );
    };

    describe('前端元素', () => {
        it('畫面正常渲染管理後台', () => {
            renderComponent();

            expect(screen.getByRole('heading', { name: /管理後台/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /← 返回/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
            expect(screen.getByText('管理員專屬頁面')).toBeInTheDocument();
        });
    });

    describe('前端邏輯', () => {
        it('正確顯示管理員身分標籤', () => {
            (useAuth as any).mockReturnValue({
                user: { role: 'admin' },
                logout: mockLogout,
            });

            renderComponent();

            const badge = screen.getByText('管理員');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('role-badge', 'admin');
        });

        it('正確顯示一般用戶身分標籤', () => {
            (useAuth as any).mockReturnValue({
                user: { role: 'user' },
                logout: mockLogout,
            });

            renderComponent();

            const badge = screen.getByText('一般用戶');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('role-badge', 'user');
        });

        it('點擊登出按鈕', () => {
            renderComponent();

            const logoutButton = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutButton);

            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });

    describe('路由導向', () => {
        it('點擊返回按鈕', () => {
            renderComponent();

            const backLink = screen.getByRole('link', { name: /← 返回/i });
            expect(backLink).toHaveAttribute('href', '/dashboard');
        });
    });
});
