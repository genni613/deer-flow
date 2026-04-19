import type { AIMessage } from "@langchain/langgraph-sdk";
import { createContext, useCallback, useContext, useState } from "react";

import type { Subtask } from "./types";

export interface SubtaskContextValue {
  tasks: Record<string, Subtask>;
  setTasks: (tasks: Record<string, Subtask>) => void;
}

export const SubtaskContext = createContext<SubtaskContextValue>({
  tasks: {},
  setTasks: () => {
    /* noop */
  },
});

export function SubtasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Record<string, Subtask>>({});
  return (
    <SubtaskContext.Provider value={{ tasks, setTasks }}>
      {children}
    </SubtaskContext.Provider>
  );
}

export function useSubtaskContext() {
  const context = useContext(SubtaskContext);
  if (context === undefined) {
    throw new Error(
      "useSubtaskContext must be used within a SubtaskContext.Provider",
    );
  }
  return context;
}

export function useSubtask(id: string) {
  const { tasks } = useSubtaskContext();
  return tasks[id];
}

export function useUpdateSubtask() {
  const { tasks, setTasks } = useSubtaskContext();
  const updateSubtask = useCallback(
    // _appendMessage is an internal protocol: when present, dedup and append to
    // messageHistory, then trigger a React state update. Render-path callers
    // (message-list.tsx) omit _appendMessage, so their calls only mutate the
    // tasks record in-place without triggering setTasks (avoids infinite loops).
    (task: Partial<Subtask> & { id: string; _appendMessage?: AIMessage }) => {
      const { _appendMessage: appendMsg, ...rest } = task;
      const current = tasks[task.id];
      const updated = { ...current, ...rest } as Subtask;

      if (appendMsg) {
        const history = [...(current?.messageHistory ?? [])];
        if (!history.some((m) => m.id === appendMsg.id)) {
          history.push(appendMsg);
        }
        updated.messageHistory = history;
        tasks[task.id] = updated;
        setTasks({ ...tasks });
      } else {
        tasks[task.id] = updated;
      }
    },
    [tasks, setTasks],
  );
  return updateSubtask;
}
