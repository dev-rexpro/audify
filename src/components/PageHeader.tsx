import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export default function PageHeader({ title, leftContent, rightContent }: PageHeaderProps) {
  return (
    <div className="panel-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {leftContent}
        {title ? (
          typeof title === 'string' ? (
            <div className="panel-title"><span>{title}</span></div>
          ) : (
            <div className="panel-title">{title}</div>
          )
        ) : null}
      </div>
      {rightContent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
