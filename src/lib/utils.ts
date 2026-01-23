import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayAddress(
  address: string | null | undefined,
  maxLength: number = 100
): string {
  if (!address) return "Property";
  if (address.length <= maxLength) return address;
  const firstLine = address.split("\n")[0];
  if (firstLine.length <= maxLength) return firstLine;
  return address.slice(0, maxLength) + "...";
}

export function extractPropertySubtitle(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address.split(",").map(part => part.trim());
  if (parts.length < 2) return "";
  return parts.slice(1).join(", ");
}
