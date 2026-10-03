import React, { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { type AppRole } from "@/features/auth";
import { PageTransition } from "@/components/layout/PageTransition";
import type { TransitionPreset } from "@/lib/transitions";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import {
  DashboardPageSkeleton,
  CalendarPageSkeleton,
  KanbanPageSkeleton,
  ListPageSkeleton,
  KPIPageSkeleton,
  EfficiencyPageSkeleton,
  AuthPageSkeleton,
  TablePageSkeleton,
} from "@/components/loading";

// Lazy load all pages
const Index = lazyWithRetry(() => import("@/pages/Index"));
const DailyCalendar = lazyWithRetry(() => import("@/pages/DailyCalendar"));
const WeeklyCalendar = lazyWithRetry(() => import("@/pages/WeeklyCalendar"));
const MonthlyCalendar = lazyWithRetry(() => import("@/pages/MonthlyCalendar"));
const PendingQueue = lazyWithRetry(() => import("@/pages/PendingQueue"));
const PackagingDashboard = lazyWithRetry(() => import("@/pages/PackagingDashboard"));
const PackagingKioskPage = lazyWithRetry(() => import("@/pages/PackagingKioskPage"));
const AlertsDashboard = lazyWithRetry(() => import("@/pages/AlertsDashboard"));
const KanbanBoard = lazyWithRetry(() => import("@/pages/KanbanBoard"));
const KPIDashboard = lazyWithRetry(() => import("@/pages/KPIDashboard"));
const OperatorView = lazyWithRetry(() => import("@/pages/OperatorView"));
const EfficiencyDashboard = lazyWithRetry(() => import("@/pages/EfficiencyDashboard"));
const TechnicalAssistantPage = lazyWithRetry(() => import("@/pages/TechnicalAssistantPage"));
const QRScannerPage = lazyWithRetry(() => import("@/pages/QRScannerPage"));
const Bitrix24ConfigPage = lazyWithRetry(() => import("@/pages/Bitrix24ConfigPage"));
const TechnicalKnowledgeBase = lazyWithRetry(() => import("@/pages/TechnicalKnowledgeBase"));
const DesignSystemPage = lazyWithRetry(() => import("@/pages/DesignSystemPage"));
const NewJobPage = lazyWithRetry(() => import("@/pages/NewJobPage"));
const MachinesPage = lazyWithRetry(() => import("@/pages/MachinesPage"));
const InventoryPage = lazyWithRetry(() => import("@/pages/InventoryPage"));
const ReportBuilderPage = lazyWithRetry(() => import("@/pages/ReportBuilderPage"));
const MasterAPIPage = lazyWithRetry(() => import("@/pages/MasterAPIPage"));
const OperatorsPage = lazyWithRetry(() => import("@/pages/OperatorsPage"));
const OperatorProductivityPage = lazyWithRetry(() => import("@/pages/OperatorProductivityPage"));
const OEEDashboard = lazyWithRetry(() => import("@/pages/OEEDashboard"));
const ABCCostingDashboard = lazyWithRetry(() => import("@/pages/ABCCostingDashboard"));
const TPMDashboard = lazyWithRetry(() => import("@/pages/TPMDashboard"));
const MLPredictionsDashboard = lazyWithRetry(() => import("@/pages/MLPredictionsDashboard"));
const BIDashboard = lazyWithRetry(() => import("@/pages/BIDashboard"));
const CodeQualityDashboard = lazyWithRetry(() => import("@/pages/CodeQualityDashboard"));
const NotificationsPage = lazyWithRetry(() => import("@/pages/NotificationsPage"));
const TraceabilityPage = lazyWithRetry(() => import("@/pages/TraceabilityPage"));
const SPCDashboard = lazyWithRetry(() => import("@/pages/SPCDashboard"));
const ShiftHandoverPage = lazyWithRetry(() => import("@/pages/ShiftHandoverPage"));
const ExecutiveDashboard = lazyWithRetry(() => import("@/pages/ExecutiveDashboard"));
const GamificationPage = lazyWithRetry(() => import("@/pages/GamificationPage"));
const EnergyDashboard = lazyWithRetry(() => import("@/pages/EnergyDashboard"));
const DocumentsPage = lazyWithRetry(() => import("@/pages/DocumentsPage"));
const SettingsPage = lazyWithRetry(() => import("@/pages/SettingsPage"));
const MfaEnrollmentPage = lazyWithRetry(() => import("@/pages/MfaEnrollmentPage"));
const SecurityDashboard = lazyWithRetry(() => import("@/pages/SecurityDashboard"));
const AuthPage = lazyWithRetry(() => import("@/pages/AuthPage"));
const ResetPasswordPage = lazyWithRetry(() => import("@/pages/ResetPasswordPage"));
const InstallAppPage = lazyWithRetry(() => import("@/pages/InstallAppPage"));
const KioskPage = lazyWithRetry(() => import("@/pages/KioskPage"));
const MachineComparisonPage = lazyWithRetry(() => import("@/pages/MachineComparisonPage"));
const OperatorHistoryPage = lazyWithRetry(() => import("@/pages/OperatorHistoryPage"));
const AdminTelemetriaPage = lazyWithRetry(() => import("@/pages/AdminTelemetriaPage"));
const SystemMonitoringPage = lazyWithRetry(() => import("@/pages/SystemMonitoringPage"));
const SystemStatusPage = lazyWithRetry(() => import("@/pages/SystemStatusPage"));
const AuditTrailPage = lazyWithRetry(() => import("@/pages/AuditTrailPage"));
const DigitalTwin = lazyWithRetry(() => import("@/pages/DigitalTwin"));
const LogisticsPage = lazyWithRetry(() => import("@/pages/LogisticsPage"));
const PublicTrackingPage = lazyWithRetry(() => import("@/pages/PublicTrackingPage"));
const SimulationDashboard = lazyWithRetry(() => import("@/pages/SimulationDashboard"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

// Helper to determine transition direction based on path depth
function getNavigationDirection(prevPath: string, currentPath: string): 'forward' | 'backward' {
  if (!prevPath) return 'forward';
  
  const prevSegments = prevPath.split('/').filter(Boolean).length;
  const currentSegments = currentPath.split('/').filter(Boolean).length;
  
  if (currentSegments > prevSegments) return 'forward';
  if (currentSegments < prevSegments) return 'backward';
  
  // If segments are same, check if it's a sibling or same level
  return currentPath.length >= prevPath.length ? 'forward' : 'backward';
}

// Route-specific transition overrides (path → preset)
const ROUTE_TRANSITIONS: Record<string, TransitionPreset> = {
  '/kiosk': 'fade',
  '/track': 'fade',
  '/auth': 'fade',
  '/reset-password': 'fade',
};

function resolveRoutePreset(pathname: string): TransitionPreset | undefined {
  return ROUTE_TRANSITIONS[pathname];
}

// Helper para rotas protegidas com Suspense
function ProtectedPage({
  children,
  fallback,
  allowedRoles,
  direction = 'forward',
  transitionPreset,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  allowedRoles?: AppRole[];
  direction?: 'forward' | 'backward';
  transitionPreset?: TransitionPreset;
}) {
  const { pathname } = useLocation();
  const preset = transitionPreset ?? resolveRoutePreset(pathname);
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <PageTransition direction={direction} preset={preset}>
        <Suspense fallback={fallback}>{children}</Suspense>
      </PageTransition>
    </ProtectedRoute>
  );
}

function PublicPage({
  children,
  fallback,
  direction = 'forward',
  transitionPreset,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  direction?: 'forward' | 'backward';
  transitionPreset?: TransitionPreset;
}) {
  const { pathname } = useLocation();
  const preset = transitionPreset ?? resolveRoutePreset(pathname);
  return (
    <PageTransition direction={direction} preset={preset}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </PageTransition>
  );
}

export function AnimatedRoutes() {
  const location = useLocation();
  const [prevPath, setPrevPath] = useState(location.pathname);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  useRoutePrefetch();

  // Derived state pattern: compute during render when input changes (React docs recommended)
  if (location.pathname !== prevPath) {
    setDirection(getNavigationDirection(prevPath, location.pathname));
    setPrevPath(location.pathname);
  }






  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/auth" element={<PublicPage direction={direction} fallback={<AuthPageSkeleton />}><AuthPage /></PublicPage>} />
        <Route path="/reset-password" element={<PublicPage direction={direction} fallback={<AuthPageSkeleton />}><ResetPasswordPage /></PublicPage>} />
        <Route path="/design-system" element={<PublicPage direction={direction} fallback={<DashboardPageSkeleton />}><DesignSystemPage /></PublicPage>} />
        <Route path="/install" element={<PublicPage direction={direction} fallback={<DashboardPageSkeleton />}><InstallAppPage /></PublicPage>} />
        <Route path="/track" element={<PublicPage direction={direction} fallback={<DashboardPageSkeleton />}><PublicTrackingPage /></PublicPage>} />

        {/* Dashboard - Accessible by all roles, but useOperatorDashboardData filters content */}
        <Route path="/" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><Index /></ProtectedPage>} />

        {/* Calendar */}
        <Route path="/calendar/daily" element={<ProtectedPage direction={direction} fallback={<CalendarPageSkeleton />} allowedRoles={['coordinator', 'manager']}><DailyCalendar /></ProtectedPage>} />
        <Route path="/calendar/weekly" element={<ProtectedPage direction={direction} fallback={<CalendarPageSkeleton />} allowedRoles={['coordinator', 'manager']}><WeeklyCalendar /></ProtectedPage>} />
        <Route path="/calendar/monthly" element={<ProtectedPage direction={direction} fallback={<CalendarPageSkeleton />} allowedRoles={['coordinator', 'manager']}><MonthlyCalendar /></ProtectedPage>} />

        {/* Operations */}
        <Route path="/pending" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator']}><PendingQueue /></ProtectedPage>} />
        <Route path="/alerts" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><AlertsDashboard /></ProtectedPage>} />
        <Route path="/kanban" element={<ProtectedPage direction={direction} fallback={<KanbanPageSkeleton />} allowedRoles={['coordinator', 'manager', 'operator']}><KanbanBoard /></ProtectedPage>} />
        <Route path="/new-job" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />} allowedRoles={['coordinator', 'manager']}><NewJobPage /></ProtectedPage>} />
        <Route path="/packaging" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager', 'operator']}><PackagingDashboard /></ProtectedPage>} />
        <Route path="/packaging/kiosk" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager', 'operator']}><PackagingKioskPage /></ProtectedPage>} />

        {/* KPIs & Analytics */}
        <Route path="/kpis" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><KPIDashboard /></ProtectedPage>} />
        <Route path="/efficiency" element={<ProtectedPage direction={direction} fallback={<EfficiencyPageSkeleton />} allowedRoles={['coordinator', 'manager']}><EfficiencyDashboard /></ProtectedPage>} />
        <Route path="/oee" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><OEEDashboard /></ProtectedPage>} />
        <Route path="/spc" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><SPCDashboard /></ProtectedPage>} />
        <Route path="/executive" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['manager', 'coordinator']}><ExecutiveDashboard /></ProtectedPage>} />
        <Route path="/bi" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['manager', 'coordinator']}><BIDashboard /></ProtectedPage>} />
        <Route path="/report-builder" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['manager', 'coordinator']}><ReportBuilderPage /></ProtectedPage>} />

        {/* ABC Costing — canonical + alias */}
        <Route path="/abc-costing" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><ABCCostingDashboard /></ProtectedPage>} />
        <Route path="/abc" element={<Navigate to="/abc-costing" replace />} />

        {/* TPM & ML */}
        <Route path="/tpm" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><TPMDashboard /></ProtectedPage>} />
        <Route path="/ml-predictions" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><MLPredictionsDashboard /></ProtectedPage>} />
        <Route path="/digital-twin" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><DigitalTwin /></ProtectedPage>} />

        {/* Operators */}
        <Route path="/operator" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />}><OperatorView /></ProtectedPage>} />
        <Route path="/operators" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager']}><OperatorsPage /></ProtectedPage>} />
        <Route path="/operator-productivity" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><OperatorProductivityPage /></ProtectedPage>} />
        <Route path="/operator-history" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager']}><OperatorHistoryPage /></ProtectedPage>} />
        <Route path="/operators/productivity" element={<Navigate to="/operator-productivity" replace />} />

        {/* Resources */}
        <Route path="/machines" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager']}><MachinesPage /></ProtectedPage>} />
        <Route path="/machines/compare" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><MachineComparisonPage /></ProtectedPage>} />
        <Route path="/energy" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><EnergyDashboard /></ProtectedPage>} />
        <Route path="/inventory" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager']}><InventoryPage /></ProtectedPage>} />

        {/* Quality & Traceability */}
        <Route path="/traceability" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager']}><TraceabilityPage /></ProtectedPage>} />
        <Route path="/logistics" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager']}><LogisticsPage /></ProtectedPage>} />

        {/* Knowledge & Documents */}
        <Route path="/assistant" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><TechnicalAssistantPage /></ProtectedPage>} />
        <Route path="/knowledge" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />}><TechnicalKnowledgeBase /></ProtectedPage>} />
        <Route path="/documents" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />}><DocumentsPage /></ProtectedPage>} />

        {/* Tools */}
        <Route path="/scanner" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><QRScannerPage /></ProtectedPage>} />
        <Route path="/shift-handover" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><ShiftHandoverPage /></ProtectedPage>} />
        <Route path="/gamification" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />}><GamificationPage /></ProtectedPage>} />
        <Route path="/notifications" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><NotificationsPage /></ProtectedPage>} />

        {/* Admin */}
        <Route path="/mfa-enrollment" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><MfaEnrollmentPage /></ProtectedPage>} />
        <Route path="/integrations/bitrix24" element={<ProtectedPage direction={direction} fallback={<TablePageSkeleton />} allowedRoles={['coordinator']}><Bitrix24ConfigPage /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />} allowedRoles={['coordinator', 'manager']}><SettingsPage /></ProtectedPage>} />
        <Route path="/security" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />} allowedRoles={['coordinator', 'manager']}><SecurityDashboard /></ProtectedPage>} />
        <Route path="/audit" element={<ProtectedPage direction={direction} fallback={<ListPageSkeleton />} allowedRoles={['coordinator', 'manager']}><AuditTrailPage /></ProtectedPage>} />
        <Route path="/master-api" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><MasterAPIPage /></ProtectedPage>} />
        <Route path="/code-quality" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><CodeQualityDashboard /></ProtectedPage>} />
        <Route path="/admin/telemetria" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><AdminTelemetriaPage /></ProtectedPage>} />
        <Route path="/admin/monitoring" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><SystemMonitoringPage /></ProtectedPage>} />
        <Route path="/status" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />}><SystemStatusPage /></ProtectedPage>} />
        <Route path="/simulation" element={<ProtectedPage direction={direction} fallback={<KPIPageSkeleton />} allowedRoles={['coordinator', 'manager']}><SimulationDashboard /></ProtectedPage>} />

        {/* Kiosk */}
        <Route path="/kiosk" element={<ProtectedPage direction={direction} fallback={<DashboardPageSkeleton />}><KioskPage /></ProtectedPage>} />

        {/* 404 */}
        <Route path="*" element={<PublicPage direction={direction} fallback={<AuthPageSkeleton />}><NotFound /></PublicPage>} />
      </Routes>
    </AnimatePresence>
  );
}
