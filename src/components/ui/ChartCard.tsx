import { DivideIcon as LucideIcon } from 'lucide-react';

interface ChartCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function ChartCard({
  title,
  icon: Icon,
  iconColor = 'text-gold-500',
  children,
  actions
}: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-luxury overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <Icon className={`h-5 w-5 mr-2 ${iconColor}`} />
            <h2 className="text-lg font-semibold text-heading">{title}</h2>
          </div>
          {actions && <div className="w-full sm:w-auto">{actions}</div>}
        </div>
      </div>
      <div className="p-4 sm:p-6 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}