import { ReactNode } from 'react';

interface PopoverMenuProps {
  items: Array<{ icon?: ReactNode; label: string; disabled?: boolean; onClick?: () => void }>;
  className?: string;
  style?: React.CSSProperties;
}

export default function PopoverMenu({ items, className = '', style }: PopoverMenuProps) {
  return (
    <div className={`ios-popover-menu ${className}`} style={style}>
      {items.map((item, idx) => (
        <button
          key={idx}
          className={`ios-popover-item ${item.disabled ? 'disabled' : ''}`}
          onClick={item.onClick}
          disabled={item.disabled}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}


