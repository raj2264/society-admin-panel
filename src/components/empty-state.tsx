import { ReactNode } from 'react';
import {
  Calendar,
  FileText,
  Users,
  Store,
  AlertTriangle,
  Megaphone,
  BarChart,
  Search,
  LayoutDashboard,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: 'calendar' | 'document' | 'users' | 'store' | 'alert' | 'megaphone' | 'chart' | 'search' | 'dashboard';
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon = 'search',
  title,
  description,
  action,
}: EmptyStateProps) {
  
  // Render the appropriate icon
  const renderIcon = () => {
    const iconProps = { size: 48, className: "text-muted-foreground/30 mb-2" };
    
    switch (icon) {
      case 'calendar':
        return <Calendar {...iconProps} />;
      case 'document':
        return <FileText {...iconProps} />;
      case 'users':
        return <Users {...iconProps} />;
      case 'store':
        return <Store {...iconProps} />;
      case 'alert':
        return <AlertTriangle {...iconProps} />;
      case 'megaphone':
        return <Megaphone {...iconProps} />;
      case 'chart':
        return <BarChart {...iconProps} />;
      case 'dashboard':
        return <LayoutDashboard {...iconProps} />;
      case 'search':
      default:
        return <Search {...iconProps} />;
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed">
      {renderIcon()}
      <h3 className="text-lg font-medium mt-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 mb-4 max-w-md">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
} 