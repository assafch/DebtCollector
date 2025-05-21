
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatCardProps } from "@/types/dashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subValue,
  trend,
  isLoading,
  className
}: StatCardProps) {
  return (
    <Card className={cn("shadow-lg", className)}>
      <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 pb-2 rounded-t-lg", color)}>
        <CardTitle className="text-sm font-medium text-primary-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary-foreground/80" />
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            {subValue && <Skeleton className="h-4 w-1/2" />}
            {trend && <Skeleton className="h-4 w-1/3" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground pt-1">{subValue}</p>}
            {trend && (
              <div className="flex items-center space-x-1 rtl:space-x-reverse text-xs pt-2">
                <trend.icon className={cn("h-4 w-4", trend.color)} />
                <span className={cn(trend.color, "font-medium")}>{trend.label.split(' ')[0]}</span>
                <span className="text-muted-foreground">{trend.label.substring(trend.label.indexOf(' ') + 1)}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
