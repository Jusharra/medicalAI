import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-luxury-500',
  iconBgColor = 'bg-luxury-100',
  change,
  subtitle
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-luxury p-4 sm:p-6 hover:shadow-luxury-lg transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center">
        <div className={`p-3 rounded-lg ${iconBgColor} mb-4 sm:mb-0 sm:mr-4`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-body">{title}</p>
          <div className="flex items-center">
            <p className="text-xl sm:text-2xl font-semibold text-heading">{value}</p>
            {change && (
              <span className={`ml-2 text-sm font-medium ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {change.isPositive ? '+' : ''}{change.value}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-body mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}