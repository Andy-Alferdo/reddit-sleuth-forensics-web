import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Users, StopCircle, Eye, X } from 'lucide-react';

interface MonitoringTargetCardProps {
  id: string;
  name: string;
  type: 'user' | 'community';
  isMonitoring: boolean;
  isFetching: boolean;
  lastFetchTime: string;
  newActivityCount: number;
  totalActivities: number;
  onSelect: (id: string) => void;
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
}

export const MonitoringTargetCard = ({
  id,
  name,
  type,
  isMonitoring,
  isFetching,
  lastFetchTime,
  newActivityCount,
  totalActivities,
  onSelect,
  onStop,
  onRemove,
}: MonitoringTargetCardProps) => {
  return (
    <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
      <div onClick={() => onSelect(id)} className="p-4">
        {/* Status indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {type === 'user' ? (
              <User className="h-4 w-4 text-primary" />
            ) : (
              <Users className="h-4 w-4 text-primary" />
            )}
            <span className="font-semibold text-sm truncate max-w-[140px]">{name}</span>
          </div>
          <span className="flex items-center gap-1">
            {isMonitoring ? (
              <>
                <span className={`h-2 w-2 rounded-full ${isFetching ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
                <Badge variant="default" className="text-[10px] px-1.5 py-0 animate-pulse">
                  Live
                </Badge>
              </>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Stopped
              </Badge>
            )}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold text-foreground">{totalActivities}</p>
            <p className="text-[10px] text-muted-foreground">Activities</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold text-primary">{newActivityCount}</p>
            <p className="text-[10px] text-muted-foreground">New</p>
          </div>
        </div>

        {lastFetchTime && (
          <p className="text-[10px] text-muted-foreground text-center mb-2">
            Last check: {lastFetchTime}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex border-t">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 rounded-none text-xs h-9"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <div className="w-px bg-border" />
        {isMonitoring ? (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none text-xs h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onStop(id);
            }}
          >
            <StopCircle className="h-3 w-3 mr-1" />
            Stop
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none text-xs h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
        )}
      </div>
    </Card>
  );
};
