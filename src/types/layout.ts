
import type { LucideIcon } from 'lucide-react'; // Keep for internal use or type hints if needed elsewhere

export interface MenuItemType {
  name: string;
  iconName: string; // Changed from icon: LucideIcon to pass string names
  path: string;
}
