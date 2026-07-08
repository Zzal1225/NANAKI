import {
  getAllArchiveItems,
  getAllBodyRecords,
  getAllBpRecords,
  getAllBudgetSettings,
  getAllExerciseRecords,
  getAllExpenses,
  getAllHabits,
  getAllHospitalRecords,
  getAllPeriodRecords,
  getAllSleepRecords,
  getAllSugarRecords,
  getAppSettings,
  getHabitLogsInRange,
} from '../db'
import type {
  AppSettings,
  ArchiveItem,
  BloodPressureRecord,
  BloodSugarRecord,
  BodyRecord,
  BudgetSettings,
  ExerciseRecord,
  Expense,
  Habit,
  HabitLog,
  HospitalRecord,
  PeriodRecord,
  SleepRecord,
} from '../types'

export interface NanakiDataPayload {
  appSettings: AppSettings
  budgetSettings: BudgetSettings[]
  expenses: Expense[]
  bodyRecords: BodyRecord[]
  archiveItems: ArchiveItem[]
  habits: Habit[]
  habitLogs: HabitLog[]
  periodRecords: PeriodRecord[]
  bpRecords: BloodPressureRecord[]
  sugarRecords: BloodSugarRecord[]
  sleepRecords: SleepRecord[]
  hospitalRecords: HospitalRecord[]
  exerciseRecords: ExerciseRecord[]
}

export async function collectAllNanakiData(): Promise<NanakiDataPayload> {
  const [
    appSettings,
    budgetSettings,
    expenses,
    bodyRecords,
    archiveItems,
    habits,
    habitLogs,
    periodRecords,
    bpRecords,
    sugarRecords,
    sleepRecords,
    hospitalRecords,
    exerciseRecords,
  ] = await Promise.all([
    getAppSettings(),
    getAllBudgetSettings(),
    getAllExpenses(),
    getAllBodyRecords(),
    getAllArchiveItems(),
    getAllHabits(),
    getHabitLogsInRange('0000-01-01', '9999-12-31'),
    getAllPeriodRecords(),
    getAllBpRecords(),
    getAllSugarRecords(),
    getAllSleepRecords(),
    getAllHospitalRecords(),
    getAllExerciseRecords(),
  ])

  return {
    appSettings,
    budgetSettings,
    expenses,
    bodyRecords,
    archiveItems,
    habits,
    habitLogs,
    periodRecords,
    bpRecords,
    sugarRecords,
    sleepRecords,
    hospitalRecords,
    exerciseRecords,
  }
}
