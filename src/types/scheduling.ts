// Types for the Scheduling System

export type JobStatus =
  | 'queue'
  | 'ready'
  | 'scheduled'
  | 'production'
  | 'finished'
  | 'paused'
  | 'cancelled'
  | 'delayed'
  | 'rework'
  | 'buffer'
  | 'packaging';

export type UserRole = 'coordinator' | 'operator' | 'manager';

export type TechniqueId =
  | 'silk-textile'
  | 'silk-vinyl-flat'
  | 'silk-vinyl-rotative'
  | 'silk-decal'
  | 'fiber-laser'
  | 'laser-co2'
  | 'laser-uv'
  | 'tampo'
  | 'hot-stamp'
  | 'thermal-press'
  | 'sublimation-mug'
  | 'decal-oven'
  | 'dtf-uv-application'
  | 'dtf-textile'
  | 'dtf-uv'
  | 'cut-media';

export interface Technique {
  id: TechniqueId;
  name: string;
  shortName: string;
  color: string;
  machines: Machine[];
  setupTime: number; // in minutes
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  techniqueId: TechniqueId;
  isActive: boolean;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  machineIds: string[];
  isActive: boolean;
}

export interface Job {
  id: string;
  orderNumber: string;
  client: string;
  product: string;
  quantity: number;
  techniqueId: TechniqueId;
  machineId: string;
  operatorId: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  estimatedDuration: number; // in minutes
  status: JobStatus;
  gravureColor: string;
  artworkUrl?: string;
  notes?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;
  lostPieces?: number;
  lostPhotos?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export interface DaySchedule {
  date: Date;
  jobs: Job[];
}

export interface MachineOccupancy {
  machineId: string;
  machineName: string;
  techniqueId: TechniqueId;
  totalMinutes: number;
  occupiedMinutes: number;
  occupancyRate: number;
  jobCount: number;
}

export interface DashboardStats {
  totalJobs: number;
  completedJobs: number;
  inProgressJobs: number;
  delayedJobs: number;
  totalPieces: number;
  lostPieces: number;
  averageOccupancy: number;
  productivityByMachine: MachineOccupancy[];
}

export type ViewMode = 'daily' | 'weekly' | 'kanban' | 'list' | 'occupancy' | 'alerts';
