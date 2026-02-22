import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup, SelectSeparator } from '@/components/ui/select';
import { Search, User, Users, X, Loader2, Plus } from 'lucide-react';
import { useMonitoring, MAX_TARGETS } from '@/contexts/MonitoringContext';
import { MonitoringTargetCard } from '@/components/monitoring/MonitoringTargetCard';
import { MonitoringDetailView } from '@/components/monitoring/MonitoringDetailView';

const Monitoring = () => {
  const location = useLocation();
  const {
    targets,
    selectedTargetId,
    setSelectedTargetId,
    selectedTarget,
    isSearching,
    handleSearch,
    handleStopTarget,
    handleRestartTarget,
    handleRemoveTarget,
    loadSavedSession,
  } = useMonitoring();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'user' | 'community' | ''>('');

  // Prefill user from navigation state (e.g., from Analysis page)
  useEffect(() => {
    const prefillUser = (location.state as any)?.prefillUser as string | undefined;
    if (prefillUser) {
      setSearchQuery(prefillUser);
      setSearchType('user');
      // Auto-trigger search after state is set
      setTimeout(() => {
        handleSearch(prefillUser, 'user');
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Load saved session from navigation state
  useEffect(() => {
    const loadSessionId = (location.state as any)?.loadSession as string | undefined;
    if (!loadSessionId) return;
    loadSavedSession(loadSessionId);
  }, [location.state, loadSavedSession]);

  const onSearch = async () => {
    if (!searchQuery.trim() || !searchType) return;
    await handleSearch(searchQuery, searchType);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background relative">
      {isSearching && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">Loading monitoring data...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
        </div>
      )}
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Reddit Monitoring</h2>
          <p className="text-muted-foreground">
            Start monitoring any Reddit user or community for activity and trends
          </p>
        </div>

        {/* Search Panel */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Select
                value={searchType || 'reset'}
                onValueChange={(value) => setSearchType(value === 'reset' ? '' : value as 'user' | 'community')}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reset">Select</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Select Target</SelectLabel>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        u/Username
                      </div>
                    </SelectItem>
                    <SelectItem value="community">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        r/Subreddit (Community)
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Input
                  placeholder={
                    !searchType
                      ? 'Enter Reddit username or community name to monitor...'
                      : searchType === 'user'
                        ? 'Enter Username'
                        : 'Enter Community Name'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  className="pr-20"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-10 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={onSearch}
                  disabled={!searchType || isSearching}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {targets.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {targets.filter(t => t.isMonitoring).length}/{MAX_TARGETS} active monitoring slots
              </p>
            )}
          </CardContent>
        </Card>

        {/* Detail View - when a target is selected */}
        {selectedTarget && (
          <MonitoringDetailView
            profileData={selectedTarget.profileData}
            activities={selectedTarget.activities}
            wordCloudData={selectedTarget.wordCloudData}
            isMonitoring={selectedTarget.isMonitoring}
            isFetching={selectedTarget.isFetching}
            lastFetchTime={selectedTarget.lastFetchTime}
            newActivityCount={selectedTarget.newActivityCount}
            onStop={() => handleStopTarget(selectedTarget.id)}
            onBack={() => setSelectedTargetId(null)}
          />
        )}

        {/* Monitoring Cards Grid - when no target is selected */}
        {!selectedTargetId && (
          <>
            {targets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {targets.map(target => (
                  <MonitoringTargetCard
                    key={target.id}
                    id={target.id}
                    name={target.name}
                    type={target.type}
                    isMonitoring={target.isMonitoring}
                    isFetching={target.isFetching}
                    lastFetchTime={target.lastFetchTime}
                    newActivityCount={target.newActivityCount}
                    totalActivities={target.activities.length}
                    onSelect={setSelectedTargetId}
                    onStop={handleStopTarget}
                    onRestart={handleRestartTarget}
                    onRemove={handleRemoveTarget}
                  />
                ))}
                {targets.filter(t => t.isMonitoring).length < MAX_TARGETS && (
                  <Card className="border-dashed border-2 flex items-center justify-center min-h-[180px] cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.querySelector<HTMLInputElement>('input[placeholder]')?.focus()}>
                    <div className="text-center text-muted-foreground p-4">
                      <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Add Target</p>
                      <p className="text-xs">Search above to add</p>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">No Monitoring Active</p>
                  <p className="text-muted-foreground text-center max-w-md">
                    Enter a username or community above to start monitoring Reddit activity and trends in real-time. You can monitor up to {MAX_TARGETS} targets simultaneously.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Monitoring;
