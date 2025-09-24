export const mergeUserTasks = <T extends { id: number }>(
  hostedTasks: T[],
  joinedTasks: T[]
): T[] => {
  const taskMap = new Map<number, T>();

  for (const task of hostedTasks) {
    taskMap.set(task.id, task);
  }

  for (const task of joinedTasks) {
    if (!taskMap.has(task.id)) {
      taskMap.set(task.id, task);
    }
  }

  return Array.from(taskMap.values());
};
