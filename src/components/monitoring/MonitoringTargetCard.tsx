import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Users, StopCircle, Eye, X, Play, Activity, Zap } from 'lucide-react';
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

  // Pick gradient based on type + status
  const gradientClass = isMonitoring
    ? type === 'user'
      ? 'from-orange-500 via-red-500 to-rose-600'
      : 'from-blue-500 via-indigo-500 to-purple-600'
    : 'from-slate-400 via-slate-500 to-slate-600';

  return (
    <Card
      className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-1"
      onClick={() => onSelect(id)}
    >
      {/* Gradient header area */}
      <div className={`relative bg-gradient-to-br ${gradientClass} px-4 pt-4 pb-10`}>
        {/* Top row: prefix + name + karma */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-white/70 text-xs font-medium">{prefix}</span>
            <span className="text-white font-bold text-sm truncate">{name}</span>
          </div>
          {type === 'user' && karma !== undefined && (
            <span className="flex items-center gap-1 text-white/90 text-[11px] font-semibold bg-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm shrink-0">
              <Zap className="h-3 w-3" />
              {karma.toLocaleString()}
            </span>
          )}
          {type === 'community' && memberCount && (
            <span className="flex items-center gap-1 text-white/90 text-[11px] font-semibold bg-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm shrink-0">
              <Users className="h-3 w-3" />
              {memberCount}
            </span>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5">
          {isMonitoring ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-green-500/80 rounded-full px-2 py-0.5 backdrop-blur-sm">
              <span className={`h-1.5 w-1.5 rounded-full bg-white ${isFetching ? 'animate-pulse' : ''}`} />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-white/70 bg-white/10 rounded-full px-2 py-0.5">
              STOPPED
            </span>
          )}
        </div>

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
      </div>

      {/* Avatar - overlapping the gradient and content */}
      <div className="flex justify-center -mt-8 relative z-10">
        <div className="w-16 h-16 rounded-full border-4 border-card bg-card shadow-lg overflow-hidden">
          {iconImg ? (
            <img
              src={iconImg}
              alt={`${name} avatar`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (sibling) sibling.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradientClass} ${iconImg ? 'hidden' : ''}`}>
            {type === 'user' ? (
              <User className="h-7 w-7 text-white" />
            ) : (
              <Users className="h-7 w-7 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 pt-2 pb-3">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center p-2 rounded-lg bg-muted/50 border border-border/40">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Activity className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-lg font-extrabold text-foreground leading-none">{totalActivities}</p>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">Activities</p>
          </div>
          <div className={`text-center p-2 rounded-lg border ${newActivityCount > 0 ? 'bg-primary/10 border-primary/30' : 'bg-muted/50 border-border/40'}`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Zap className={`h-3 w-3 ${newActivityCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <p className={`text-lg font-extrabold leading-none ${newActivityCount > 0 ? 'text-primary' : 'text-foreground'}`}>{newActivityCount}</p>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">New</p>
          </div>
        </div>

        {lastFetchTime && (
          <p className="text-[10px] text-muted-foreground text-center mb-1">
            Last check: {lastFetchTime}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 rounded-none text-xs h-9 hover:bg-muted/80"
          onClick={(e) => { e.stopPropagation(); onSelect(id); }}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
        <div className="w-px bg-border/50" />
        {isMonitoring ? (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none text-xs h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onStop(id); }}
          >
            <StopCircle className="h-3.5 w-3.5 mr-1" />
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
              <Play className="h-3.5 w-3.5 mr-1" />
              Start
            </Button>
            <div className="w-px bg-border/50" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none text-xs h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onRemove(id); }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};
