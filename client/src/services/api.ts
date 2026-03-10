import type { Mode } from "../types";

export const fetchItems = async (mode: Mode, level: number = 1, count: number = 15): Promise<string[]> => {
  const response = await fetch(`/api/words?mode=${mode}&level=${level}&count=${count}`);
  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }
  return response.json();
};
