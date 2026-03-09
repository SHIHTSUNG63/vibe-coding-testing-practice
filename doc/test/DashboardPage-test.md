> 狀態：初始為 [ ]、完成為 [x]
> 注意：狀態只能在測試通過後由流程更新。
> 測試類型：前端元素、function 邏輯、Mock API、驗證權限...

---

## [x] 【前端邏輯】管理員看到專屬連結

**範例輸入**：AuthContext 提供 `user.role` 為 `admin`，預設 Mock API 回傳空列表  
**期待輸出**：Header 導覽列出現「🛠️ 管理後台」連結

---

## [x] 【前端邏輯】一般用戶看不到專屬連結

**範例輸入**：AuthContext 提供 `user.role` 為 `user`，預設 Mock API 回傳空列表  
**期待輸出**：Header 導覽列不應該出現「🛠️ 管理後台」連結

---

## [x] 【前端邏輯】歡迎區塊正常渲染用戶資訊

**範例輸入**：AuthContext 提供 `user.username` 為 `TestUser`，`user.role` 為 `user`  
**期待輸出**：歡迎區塊顯示「Welcome, TestUser 👋」，頭像顯示「T」，身分標籤顯示「一般用戶」

---

## [x] 【Mock API】初始載入時顯示 Loading

**範例輸入**：`productApi.getProducts` 設定為延遲回傳  
**期待輸出**：商品列表區塊顯示「載入商品中...」與 spinner

---

## [x] 【Mock API】成功取得商品資料並渲染

**範例輸入**：`productApi.getProducts` 成功回傳兩筆商品資料（例如 商品A 100元, 商品B 200元）  
**期待輸出**：畫面不再顯示 Loading，並成功渲染出 商品A 與 商品B 的卡片，且價格有正確格式化（例如 `NT$ 100`）

---

## [ ] 【Mock API】取得商品資料失敗且後端有錯誤訊息

**範例輸入**：`productApi.getProducts` 失敗，AxiosError 回傳 500 錯誤與 `{ message: '伺服器發生異常' }`  
**期待輸出**：商品列表區塊顯示錯誤圖示與文字「伺服器發生異常」

---

## [ ] 【Mock API】取得商品資料失敗時的預設錯誤訊息

**範例輸入**：`productApi.getProducts` 失敗，AxiosError 回傳 500 錯誤但無自訂 `message`  
**期待輸出**：商品列表區塊顯示錯誤區塊與預設訊息「無法載入商品資料」

---

## [ ] 【前端邏輯】點擊登出按鈕

**範例輸入**：點擊 Header 的「登出」按鈕  
**期待輸出**：觸發 `logout()` 函數，並導向至 `/login`（使用 replace，且 state 設為 null）
