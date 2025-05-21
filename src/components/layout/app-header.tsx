import { FileSpreadsheet } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-background border-b shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <FileSpreadsheet className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-2xl font-semibold text-foreground">
          Priority Connect Viewer
        </h1>
      </div>
    </header>
  );
}
