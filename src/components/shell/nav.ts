import { BookOpenCheck, Box, ClipboardCheck, Columns2, GraduationCap, LayoutGrid, type LucideIcon } from "lucide-react";

export interface NavItem {
  group: "Overview" | "Equipment" | "Learn";
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV: NavItem[] = [
  { group: "Overview", href: "/", label: "Dashboard", icon: LayoutGrid, description: "Progress and where to continue" },
  { group: "Equipment", href: "/explorer", label: "Explorer", icon: BookOpenCheck, description: "Families, technologies and status" },
  { group: "Equipment", href: "/simulator", label: "3D Simulator", icon: Box, description: "Scotch yoke and ball valve" },
  { group: "Equipment", href: "/compare", label: "Compare", icon: Columns2, description: "Scotch yoke vs rack and pinion" },
  { group: "Learn", href: "/academy", label: "Academy", icon: GraduationCap, description: "Lessons from basics to sizing" },
  { group: "Learn", href: "/assessments", label: "Assessments", icon: ClipboardCheck, description: "Check what you know" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
