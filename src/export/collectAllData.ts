import {
  getAllArchiveItems,
  getAllBodyRecords,
  getAllBpRecords,
  getAllBudgetSettings,
  getAllExerciseRecords,
  getAllExpenses,
  getAllHabits,
  getAllHospitalRecords,
  getAllLifeRoutines,
  getAllPantryItems,
  getAllPeriodRecords,
  getAllSleepRecords,
  getAllSugarRecords,
  getAllSupplementIntakeLogs,
  getAllSupplementProducts,
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
  LifeRoutine,
  PantryItem,
  PeriodRecord,
  SleepRecord,
  SupplementIntakeLog,
  SupplementProduct,
} from '../types'

export interface NanakiDataPayload {
  appSettings: AppSettings
  budgetSettings: BudgetSettings[]
  expenses: Expense[]
  bodyRecords: BodyRecord[]
  archiveItems: ArchiveItem[]
  habits: Habit[]
  habitLogs: HabitLog[]
  lifeRoutines: LifeRoutine[]
  pantryItems: PantryItem[]
  supplementProducts: SupplementProduct[]
  supplementIntakeLogs: SupplementIntakeLog[]
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
    lifeRoutines,
    pantryItems,
    supplementProducts,
    supplementIntakeLogs,
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
    getAllLifeRoutines(),
    getAllPantryItems(),
    getAllSupplementProducts(),
    getAllSupplementIntakeLogs(),
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
    lifeRoutines,
    pantryItems,
    supplementProducts,
    supplementIntakeLogs,
    periodRecords,
    bpRecords,
    sugarRecords,
    sleepRecords,
    hospitalRecords,
    exerciseRecords,
  }
}
