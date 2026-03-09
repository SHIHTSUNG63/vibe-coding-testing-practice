import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
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
            user: { username: 'TestUser', role: 'user' },
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

    describe('前端邏輯', () => {
        it('管理員看到專屬連結', async () => {
            (useAuth as any).mockReturnValue({
                user: { username: 'AdminUser', role: 'admin' },
                logout: mockLogout,
            });

            renderComponent();
            
            // Wait for loading to finish just so component is settled
            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByRole('link', { name: /🛠️ 管理後台/i })).toBeInTheDocument();
        });

        it('一般用戶看不到專屬連結', async () => {
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

        it('歡迎區塊正常渲染用戶資訊', async () => {
            (useAuth as any).mockReturnValue({
                user: { username: 'TestUser', role: 'user' },
                logout: mockLogout,
            });

            renderComponent();

            await waitFor(() => {
                 expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('Welcome, TestUser 👋')).toBeInTheDocument();
            expect(screen.getByText('T')).toBeInTheDocument();
            expect(screen.getByText('一般用戶')).toBeInTheDocument();
        });

        it('點擊登出按鈕', async () => {
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

    describe('Mock API', () => {
        it('初始載入時顯示 Loading', () => {
            // Keep the promise pending to simulate loading state indefinitely
            (productApi.getProducts as any).mockImplementation(() => new Promise(() => {}));

            renderComponent();

            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
        });

        it('成功取得商品資料並渲染', async () => {
            const mockProducts = [
                { id: '1', name: '商品A', description: '這是商品A', price: 100 },
                { id: '2', name: '商品B', description: '這是商品B', price: 200 }
            ];
            (productApi.getProducts as any).mockResolvedValue(mockProducts);

            renderComponent();

            // wait for loading to disappear
            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('商品A')).toBeInTheDocument();
            expect(screen.getByText('商品B')).toBeInTheDocument();
            // check if price is correctly formatted
            expect(screen.getByText('NT$ 100')).toBeInTheDocument();
            expect(screen.getByText('NT$ 200')).toBeInTheDocument();
        });

        it('取得商品資料失敗且後端有錯誤訊息', async () => {
            (productApi.getProducts as any).mockRejectedValue({
                response: {
                    data: { message: '伺服器發生異常' }
                }
            });

            renderComponent();

            expect(await screen.findByText('伺服器發生異常')).toBeInTheDocument();
        });

        it('取得商品資料失敗時的預設錯誤訊息', async () => {
            (productApi.getProducts as any).mockRejectedValue({
                response: {
                    status: 500
                    // No data.message provided
                }
            });

            renderComponent();

            expect(await screen.findByText('無法載入商品資料')).toBeInTheDocument();
        });
    });
});
