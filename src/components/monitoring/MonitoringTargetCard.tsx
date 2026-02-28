import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Users, StopCircle, Eye, X, Play, MessageSquare, ArrowBigUp } from 'lucide-react';
import { ProfileData } from '@/contexts/MonitoringContext';

interface MonitoringTargetCardProps {
  id: string;
  name: string;
  type: 'user' | 'community';
  isMonitoring: boolean;
  isFetching: boolean;
  lastFetchTime: string;
  newActivityCount: number;
  totalActivities: number;
  profileData?: ProfileData;
  onSelect: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
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
  profileData,
  onSelect,
  onStop,
  onRestart,
  onRemove,
}: MonitoringTargetCardProps) => {
  const iconImg = profileData?.iconImg;
  const prefix = type === 'user' ? 'u/' : 'r/';
  const karma = profileData?.totalKarma;
  const memberCount = profileData?.memberCount;

  return (
    <Card
      className="group relative overflow-hidden border border-border/60 hover:border-primary/40 transition-all duration-300 cursor-pointer bg-card hover:shadow-lg hover:shadow-primary/5"
      onClick={() => onSelect(id)}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isMonitoring ? 'bg-gradient-to-r from-primary via-primary/80 to-primary/60' : 'bg-muted-foreground/20'}`} />

      <div className="p-4 pb-3">
        {/* Avatar + Name row */}
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full border-2 border-border bg-muted overflow-hidden">
              {iconImg ? (
                <img
                  src={iconImg}
                  alt={`${name} avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center bg-primary/10 ${iconImg ? 'hidden' : ''}`}>
                {type === 'user' ? (
                  <User className="h-5 w-5 text-primary" />
                ) : (
                  <Users className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
            {/* Online indicator */}
            {isMonitoring && (
              <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${isFetching ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
            )}
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">{prefix}</span>
              <span className="font-semibold text-sm text-foreground truncate">{name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isMonitoring ? (
                <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 font-bold tracking-wide animate-pulse">
                  LIVE
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium tracking-wide">
                  STOPPED
                </Badge>
              )}
              {type === 'user' && karma !== undefined && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <ArrowBigUp className="h-3 w-3" />
                  {karma.toLocaleString()}
                </span>
              )}
              {type === 'community' && memberCount && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {memberCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center p-2 rounded-md bg-muted/60 border border-border/40">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <p className="text-base font-bold text-foreground">{totalActivities}</p>
            </div>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Activities</p>
          </div>
          <div className="text-center p-2 rounded-md bg-primary/5 border border-primary/20">
            <p className="text-base font-bold text-primary">{newActivityCount}</p>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">New</p>
          </div>
        </div>

        {lastFetchTime && (
          <p className="text-[10px] text-muted-foreground text-center">
            Last check: {lastFetchTime}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-border/60">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 rounded-none text-xs h-9 hover:bg-primary/5"
          onClick={(e) => { e.stopPropagation(); onSelect(id); }}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <div className="w-px bg-border/60" />
        {isMonitoring ? (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none text-xs h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onStop(id); }}
          >
            <StopCircle className="h-3 w-3 mr-1" />
            Stop
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 rounded-none text-xs h-9 text-primary hover:text-primary hover:bg-primary/10"
              onClick={(e) => { e.stopPropagation(); onRestart(id); }}
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
            <div className="w-px bg-border/60" />
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 rounded-none text-xs h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onRemove(id); }}
            >
              <X className="h-3 w-3 mr-1" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};
