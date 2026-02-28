import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { formatFullDateTime } from '@/lib/dateUtils';

interface SavedAnalysisCardProps {
  title: string;
  subtitle: string;
  analyzedAt: string;
  icon: LucideIcon;
  onClick: () => void;
}

export const SavedAnalysisCard = ({ title, subtitle, analyzedAt, icon: Icon, onClick }: SavedAnalysisCardProps) => {
  return (
    <Card
      className="border hover:border-primary/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {analyzedAt ? formatFullDateTime(analyzedAt) : 'Unknown date'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
