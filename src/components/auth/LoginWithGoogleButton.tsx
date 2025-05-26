
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LogIn } from 'lucide-react'; // Using LogIn as a generic login icon

export function LoginWithGoogleButton() {
  const { loginWithGoogle, loading } = useAuth();

  return (
    <Button 
      onClick={loginWithGoogle} 
      disabled={loading} 
      className="w-full justify-center"
      variant="outline"
    >
      <LogIn className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />
      Login with Google
    </Button>
  );
}
