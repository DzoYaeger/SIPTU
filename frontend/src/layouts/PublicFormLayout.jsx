import { Layout } from 'antd';
import './PublicFormLayout.css';

const { Content } = Layout;

const PublicFormLayout = ({ children }) => {
  return (
    <Layout className="public-form-layout">
      <Content className="public-form-content">
        {children}
      </Content>
    </Layout>
  );
};

export default PublicFormLayout;
