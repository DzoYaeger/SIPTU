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
    borderRadius: 6,
    fontSize: 13, // Base compact size (13px)
    fontSizeHeading1: 22,
    fontSizeHeading2: 18,
    fontSizeHeading3: 15,
    fontSizeHeading4: 13,
    fontSizeHeading5: 12,
    fontSizeLG: 15,
    fontSizeSM: 11,
    fontSizeXL: 18,
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      bodyBg: '#F5EFE6',
    },
    Menu: {
      itemHeight: 34,
      fontSize: 13,
    },
    Button: {
      controlHeight: 32,
      fontSize: 13,
    },
    Table: {
      cellPaddingBlock: 6,
      cellPaddingInline: 8,
      fontSize: 12, // Table cell content <= 12px
    },
    Form: {
      itemMarginBottom: 10,
      labelFontSize: 12,
    },
    Input: {
      controlHeight: 32,
      fontSize: 13,
    },
    Select: {
      controlHeight: 32,
      fontSize: 13,
    },
    DatePicker: {
      controlHeight: 32,
      fontSize: 13,
    },
    Modal: {
      titleFontSize: 15,
      padding: 16,
    },
    Card: {
      headerFontSize: 15,
    },
    Tabs: {
      titleFontSize: 13,
    },
    Tag: {
      fontSize: 11,
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
