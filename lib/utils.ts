export function formatDisplayName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
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
