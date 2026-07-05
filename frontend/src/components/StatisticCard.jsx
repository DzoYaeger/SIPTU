import { Card, Typography, Spin } from 'antd';

const StatisticCard = ({ title, value, icon, color, loading, style, onClick, hoverable }) => (
    <Card
        variant="borderless"
        style={{ height: '100%', borderRadius: 12, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)', ...style }}
        styles={{ body: { padding: '20px 24px' } }}
        onClick={onClick}
        hoverable={hoverable}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>{title}</Typography.Text>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: '#1f1f1f' }}>
                    {loading ? <Spin size="small" /> : value}
                </div>
            </div>
            <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: `${color}15`, // 15% opacity
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                fontSize: 22
            }}>
                {icon}
            </div>
        </div>
    </Card>
);

export default StatisticCard;
