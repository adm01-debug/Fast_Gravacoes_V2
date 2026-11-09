import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface DashboardSkeletonProps {
  rows?: number;
  columns?: number;
}

export function DashboardSkeleton({ rows = 3, columns = 4 }: DashboardSkeletonProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-8 p-1"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Stats Row */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
        {[...Array(columns)].map((_, i) => (
          <motion.div key={i} variants={item}>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-2 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-[450px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <div className="flex justify-between">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-12" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="h-[450px]">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center py-4">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* List/Table View */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-32" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
