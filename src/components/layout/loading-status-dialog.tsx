
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LoadingStatusDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  progress?: number; // 0-100
}

export function LoadingStatusDialog({ isOpen, title, description, progress }: LoadingStatusDialogProps) {
  // Do not render the dialog if isOpen is false to ensure it's fully unmounted
  // This helps with Radix UI's controlled dialog behavior.
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} modal={true}> {/* `modal={true}` prevents closing on overlay click implicitly */}
      <DialogContent 
        className="sm:max-w-md" 
        hideCloseButton={true} // Prevent user from closing it
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing on outside click
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevent closing with Escape key
      >
        <DialogHeader className="text-center rtl:text-right">
          <DialogTitle className="flex items-center justify-center rtl:justify-start text-xl">
            <LoadingSpinner size={24} className="mr-3 rtl:ml-3 rtl:mr-0" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-3 text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        {progress !== undefined && (
          <div className="py-4 space-y-2">
            <Progress value={progress} className="w-full h-2.5" />
            <p className="text-center text-sm text-muted-foreground">{progress}%</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
