import { useState } from 'react';
import { Reward } from '@/hooks/useGamification';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { VoiceButton } from '@/components/voice/VoiceCommands';
import { useGamification } from '@/hooks/useGamification';
import { toast } from 'sonner';
import { Trophy, Medal, Star, Target, Zap, Award, Crown, TrendingUp, Command, Package, Clock, Sparkles, Loader2, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
const achievementIcons: Record<string, React.ElementType> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  target: Target,
  zap: Zap,
  award: Award,
  crown: Crown,
};

export default function GamificationPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [activeTab, setActiveTab] = useState<'ranking' | 'rewards' | 'history'>('ranking');

  const dateLocale = i18n.language === 'en-US' ? enUS : i18n.language === 'es-ES' ? es : ptBR;

  const {
    rankings,
    achievements,
    rewards,
    balance,
    isLoading,
    periodStart,
    periodEnd,
    redeemReward,
    redemptionsQuery
  } = useGamification(period);

  const handleRedeem = (reward: Reward) => {
    if (balance >= reward.cost_points) {
      redeemReward.mutate(reward);
    } else {
      toast.error(t('gamification.insufficientBalance'));
    }
  };

  const getRewardIcon = (iconName: string) => {
    return achievementIcons[iconName] || Trophy;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const topThree = rankings.slice(0, 3);
  const restRankings = rankings.slice(3);

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in-up">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl text-title font-bold">
                <span className="gradient-text">{t('gamification.ranking')}</span>
              </h1>
              <FavoriteButton
                path="/gamification"
                name={t('gamification.ranking')}
              />
            </div>
            <p className="text-muted-foreground">
              {format(periodStart, "dd 'de' MMMM", { locale: dateLocale })} - {format(periodEnd, "dd 'de' MMMM", { locale: dateLocale })}
            </p>
          </div>

          <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-2xl animate-pulse-glow">
            <div className="p-2 rounded-lg bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">{t('gamification.balance')}</p>
              <p className="text-xl font-black text-primary">{balance.toLocaleString()} PTS</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <VoiceButton />
            <FavoritesDropdown onNavigate={(url) => navigate(url)} />
            <Badge variant="outline" className="gap-1 text-xs hidden sm:flex">
              <Command className="h-3 w-3" />K para buscar
            </Badge>
            <Tabs value={activeTab === 'ranking' ? period : activeTab} onValueChange={(v) => {
              if (['daily', 'weekly', 'monthly'].includes(v)) {
                setPeriod(v as 'daily' | 'weekly' | 'monthly');
                setActiveTab('ranking');
              } else {
                setActiveTab(v as 'ranking' | 'rewards' | 'history');
              }
            }}>
              <TabsList className="bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="daily">{t('common.today')}</TabsTrigger>
                <TabsTrigger value="weekly">{t('common.week')}</TabsTrigger>
                <TabsTrigger value="monthly">{t('common.month')}</TabsTrigger>
                <TabsTrigger value="rewards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Star className="h-4 w-4 mr-2" />
                  {t('gamification.shop')}
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <History className="h-4 w-4 mr-2" />
                  {t('gamification.history')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === 'rewards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {rewards.map((reward) => {
              const Icon = getRewardIcon(reward.icon);
              return (
                <Card key={reward.id} className="glass-card group hover:border-primary/50 transition-all overflow-hidden border-2 border-transparent relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Icon className="h-24 w-24" />
                  </div>
                  <CardHeader className={cn("pb-2", reward.color_class)}>
                    <div className="flex justify-between items-start">
                      <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-lg">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="secondary" className="bg-white/30 text-white border-none font-black px-3 py-1 text-xs">
                        {reward.cost_points.toLocaleString()} PTS
                      </Badge>
                    </div>
                    <CardTitle className="mt-6 text-xl font-black text-white">{reward.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-8 h-12 line-clamp-2 leading-relaxed">
                      {reward.description}
                    </p>
                    <Button
                      className={cn(
                        "w-full h-12 rounded-xl font-bold transition-all duration-300",
                        balance >= reward.cost_points ? "gradient-primary shadow-lg shadow-primary/20" : "bg-muted"
                      )}
                      disabled={balance < reward.cost_points || redeemReward.isPending}
                      onClick={() => handleRedeem(reward)}
                    >
                      {redeemReward.isPending && redeemReward.variables?.id === reward.id ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      {redeemReward.isPending && redeemReward.variables?.id === reward.id ? t('gamification.redeeming') : t('gamification.redeem')}
                    </Button>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className={balance < reward.cost_points ? 'text-destructive' : 'text-success'}>
                        {balance < reward.cost_points ? t('gamification.pointsNeeded', { points: (reward.cost_points - balance).toLocaleString() }) : t('gamification.sufficientBalance')}
                      </span>
                      <span className="text-muted-foreground">{reward.stock ? t('gamification.stock', { stock: reward.stock }) : t('gamification.infiniteStock')}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <Card className="glass-card animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                {t('gamification.history')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {redemptionsQuery.data?.map((redemption) => (
                  <div key={redemption.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 group hover:bg-muted/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg bg-primary/10", redemption.reward?.color_class)}>
                        {(() => {
                          const Icon = getRewardIcon(redemption.reward?.icon || 'trophy');
                          return <Icon className="h-5 w-5" />;
                        })()}
                      </div>
                      <div>
                        <p className="font-bold">{redemption.reward?.name || '---'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(redemption.created_at || new Date()), "dd 'de' MMMM 'às' HH:mm", { locale: dateLocale })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={cn(
                        "font-black text-[10px] uppercase",
                        redemption.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        redemption.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        'bg-red-500/10 text-red-500 border-red-500/20'
                      )}>
                        {redemption.status === 'pending' ? t('maintenance.pending') :
                         redemption.status === 'approved' ? t('common.confirm') : t('jobs.statuses.cancelled')}
                      </Badge>
                      <p className="text-xs font-bold mt-1">-{redemption.points_spent} PTS</p>
                    </div>
                  </div>
                ))}
                {(!redemptionsQuery.data || redemptionsQuery.data.length === 0) && (
                  <div className="text-center py-20">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">{t('gamification.noRedemptions')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'ranking' && (
          <>
            {/* Podium */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 via-gray-500/10 to-orange-500/10">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Pódio
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-end justify-center gap-4 sm:gap-8">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-2 shadow-lg">
                    <Medal className="w-8 h-8 sm:w-10 sm:h-10 text-gray-700" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm sm:text-base truncate max-w-[100px]">
                      {topThree[1].profile?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{topThree[1].total_points} pts</p>
                  </div>
                  <div className="w-20 sm:w-24 h-16 sm:h-20 bg-gray-400 rounded-t-lg mt-2 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-700">2</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center -mt-4">
                  <Crown className="w-8 h-8 text-warning mb-1 animate-bounce" />
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-2 shadow-xl ring-4 ring-amber-300/50">
                    <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-warning" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-base sm:text-lg truncate max-w-[120px]">
                      {topThree[0].profile?.full_name}
                    </p>
                    <p className="text-sm text-warning font-semibold">{topThree[0].total_points} pts</p>
                  </div>
                  <div className="w-24 sm:w-28 h-24 sm:h-28 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-lg mt-2 flex items-center justify-center">
                    <span className="text-3xl font-bold text-warning">1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-2 shadow-lg">
                    <Award className="w-8 h-8 sm:w-10 sm:h-10 text-orange-900" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm sm:text-base truncate max-w-[100px]">
                      {topThree[2].profile?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{topThree[2].total_points} pts</p>
                  </div>
                  <div className="w-20 sm:w-24 h-12 sm:h-16 bg-orange-600 rounded-t-lg mt-2 flex items-center justify-center">
                    <span className="text-2xl font-bold text-orange-900">3</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Full Rankings */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Ranking Completo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rankings.map((r, index) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl transition-all border group",
                      index < 3 ? "bg-primary/5 border-primary/20 shadow-sm" : "hover:bg-muted/30 border-transparent"
                    )}
                  >
                    <div className="flex items-center w-full gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-inner",
                        index === 0 ? "bg-amber-400 text-amber-950 ring-4 ring-amber-400/20" :
                        index === 1 ? "bg-gray-300 text-gray-950 ring-4 ring-gray-300/20" :
                        index === 2 ? "bg-orange-500 text-orange-950 ring-4 ring-orange-500/20" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {r.position}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base truncate">{r.profile?.full_name}</p>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black h-5">
                            {t('gamification.level', { level: r.level })}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {r.total_produced.toLocaleString()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {r.total_points} pontos</span>
                        </div>
                      </div>

                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{t('gamification.xpProgress')}</p>
                        <div className="w-32">
                          <Progress value={((r.xp_progress ?? 0) / (r.xp_target || 1)) * 100} className="h-1.5 bg-muted/50" />
                          <p className="text-[9px] text-muted-foreground mt-1">
                            {r.xp_progress} / {r.xp_target} XP
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {rankings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>{t('gamification.noRanking')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" />
                {t('gamification.recentAchievements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.slice(0, 8).map((a) => {
                  const Icon = achievementIcons[a.icon] || Trophy;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{a.achievement_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        +{a.points}
                      </Badge>
                    </div>
                  );
                })}

                {achievements.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>{t('gamification.noAchievements')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </>
        )}
      </div>
    </MainLayout>
  );
}
