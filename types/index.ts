export interface Task {
  id: string;
  name: string;
  category: string;
  icon?: string;
  time?: string;
  subtasks?: string[];
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  isCompleted: boolean;
  isImportant: boolean;
  myDayDate?: string; // If set, it appears in "My Day" for that date
  createdAt: string;
  note?: string;
  status?: 'done' | 'partial' | 'skipped';
  reflection?: string;
  aiFeedback?: AIAnalysisResponse;
}

// Keep Habit as an alias for now, to avoid breaking other parts immediately
export type Habit = Task;

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  status: 'done' | 'partial' | 'skipped';
  reflection: string;
  feedback: AIAnalysisResponse;
}

export interface AIAnalysisResponse {
  sentiment_tag: string;
  burnout_risk_level: 'Low' | 'Medium' | 'High';
  daily_actionable_advice: string;
}
