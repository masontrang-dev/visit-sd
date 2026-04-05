export function getVisitRecency(lastVisited: string | null): string | null {
  if (!lastVisited) return null;
  
  const now = new Date();
  const visitDate = new Date(lastVisited);
  const daysDiff = Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 7) return "This week";
  if (daysDiff <= 30) return "This month";
  
  return null;
}

export function formatRecencyTag(lastVisited: string | null): { text: string; style: "week" | "month" } | null {
  if (!lastVisited) return null;
  
  const now = new Date();
  const visitDate = new Date(lastVisited);
  const daysDiff = Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 7) return { text: "This week", style: "week" };
  if (daysDiff <= 30) return { text: "This month", style: "month" };
  
  return null;
}
