import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

    describe('畫面渲染', () => {
        it('應該正確渲染管理後台的元素', () => {
            renderComponent();

            expect(screen.getByRole('heading', { name: /管理後台/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /← 返回/i })).toBeInTheDocument();
            expect(screen.getByText('管理員專屬頁面')).toBeInTheDocument();
        });
    });

    describe('權限顯示', () => {
        it('應正確顯示使用者的角色標籤', () => {
            // Test admin
            (useAuth as any).mockReturnValue({
                user: { role: 'admin' },
                logout: mockLogout,
            });
            const { unmount } = renderComponent();
            expect(screen.getByText('管理員')).toBeInTheDocument();
            unmount();

            // Test user
            (useAuth as any).mockReturnValue({
                user: { role: 'user' },
                logout: mockLogout,
            });
            renderComponent();
            expect(screen.getByText('一般用戶')).toBeInTheDocument();
        });
    });

    describe('登出邏輯', () => {
        it('點擊登出按鈕應觸發登出並導向登入頁', () => {
            renderComponent();

            const logoutButton = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutButton);

            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
