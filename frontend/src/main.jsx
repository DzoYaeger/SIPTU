import '@ant-design/v5-patch-for-react-19';
import '@flaticon/flaticon-uicons/css/thin/rounded.css';
import '@flaticon/flaticon-uicons/css/thin/straight.css';
import '@flaticon/flaticon-uicons/css/regular/rounded.css';
import '@flaticon/flaticon-uicons/css/regular/straight.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

const theme = {
  token: {
    colorPrimary: '#0F5B99',
    colorBgLayout: '#F5EFE6',
    colorBgContainer: '#FFFFFF',
    colorText: '#1f2d3d',
    borderRadius: 4,
    fontSize: 13,
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      bodyBg: '#F5EFE6',
    },
    Menu: {
      itemHeight: 32,
    },
    Button: {
      controlHeight: 28,
      fontSize: 13,
    },
    Table: {
      cellPaddingBlock: 6,
      cellPaddingInline: 8,
      fontSize: 13,
    },
    Form: {
      itemMarginBottom: 10,
      labelFontSize: 12,
    },
    Input: {
      controlHeight: 28,
      fontSize: 13,
    },
    Select: {
      controlHeight: 28,
      fontSize: 13,
    },
    DatePicker: {
      controlHeight: 28,
      fontSize: 13,
    },
    Modal: {
      titleFontSize: 14,
      padding: 16,
    },
  },
};

// Suppress React 19 warning and avoid infinite loop
const originalWarn = console.warn;
let warnCount = 0;
const maxWarnCount = 100; // Limit warnings to prevent infinite loop

console.warn = (msg, ...args) => {
  if (warnCount >= maxWarnCount) {
    return;
  }
  
  if (msg && msg.includes('antd v5 support React is 16 ~ 18')) {
    warnCount++;
    return;
  }
  
  warnCount++;
  originalWarn.call(console, msg, ...args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={theme}>
      <AntdApp>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
