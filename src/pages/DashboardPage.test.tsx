import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { useAuth } from '../context/AuthContext';
import { productApi } from '../api/productApi';
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

// Mock productApi
vi.mock('../api/productApi', () => {
    return {
        productApi: {
            getProducts: vi.fn(),
        },
    };
});

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default Auth config
        (useAuth as any).mockReturnValue({
            user: { username: 'Alice', role: 'admin' },
            logout: mockLogout,
        });

        // Default API config
        (productApi.getProducts as any).mockResolvedValue([]);
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );
    };

    describe('畫面渲染', () => {
        it('初始載入時應顯示載入中狀態', () => {
            // Keep the promise pending to simulate loading state indefinitely
            (productApi.getProducts as any).mockImplementation(() => new Promise(() => {}));

            renderComponent();

            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
            expect(screen.getByText('載入商品中...').previousSibling).toHaveClass('loading-spinner');
        });

        it('API 請求成功後應正確顯示商品列表', async () => {
            const mockProducts = [
                { id: '1', name: '商品A', description: '這是商品A', price: 100 },
                { id: '2', name: '商品B', description: '這是商品B', price: 200 }
            ];
            (productApi.getProducts as any).mockResolvedValue(mockProducts);

            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('商品A')).toBeInTheDocument();
            expect(screen.getByText('這是商品A')).toBeInTheDocument();
            expect(screen.getByText('NT$ 100')).toBeInTheDocument();

            expect(screen.getByText('商品B')).toBeInTheDocument();
            expect(screen.getByText('這是商品B')).toBeInTheDocument();
            expect(screen.getByText('NT$ 200')).toBeInTheDocument();
        });
    });

    describe('錯誤處理', () => {
        it('API 請求失敗時 (非 401) 應顯示錯誤訊息', async () => {
            (productApi.getProducts as any).mockRejectedValue({
                response: {
                    status: 500,
                    data: { message: '伺服器發生錯誤' }
                }
            });

            renderComponent();

            expect(await screen.findByText('伺服器發生錯誤')).toBeInTheDocument();
            expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
        });

        it('Token 過期或無效 (401) 時不顯示預設錯誤訊息', async () => {
            (productApi.getProducts as any).mockRejectedValue({
                response: {
                    status: 401,
                    data: { message: 'Token expired' }
                }
            });

            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            // Make sure the error message state wasn't updated with "Token expired" or the default error message.
            // Since error is not set, it renders the product grid. With empty mocked return before catch, products will be [].
            expect(screen.queryByText('Token expired')).not.toBeInTheDocument();
            expect(screen.queryByText('無法載入商品資料')).not.toBeInTheDocument();
        });
    });

    describe('權限顯示', () => {
        it('依據使用者名稱正確顯示歡迎詞與頭像', async () => {
            (useAuth as any).mockReturnValue({
                user: { username: 'Alice', role: 'user' },
                logout: mockLogout,
            });

            renderComponent();

            await waitFor(() => {
                 expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('Welcome, Alice 👋')).toBeInTheDocument();
            expect(screen.getByText('A')).toHaveClass('avatar');
        });

        it('為管理員時應顯示前往管理後台的連結', async () => {
            (useAuth as any).mockReturnValue({
                user: { username: 'AdminUser', role: 'admin' },
                logout: mockLogout,
            });

            renderComponent();
            
            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByRole('link', { name: /🛠️ 管理後台/i })).toBeInTheDocument();
        });

        it('非管理員時不應顯示管理後台連結', async () => {
            (useAuth as any).mockReturnValue({
                user: { username: 'NormalUser', role: 'user' },
                logout: mockLogout,
            });

            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.queryByRole('link', { name: /🛠️ 管理後台/i })).not.toBeInTheDocument();
        });
    });

    describe('登出邏輯', () => {
        it('點擊登出按鈕應觸發登出並導向登入頁', async () => {
            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            const logoutButton = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutButton);

            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
