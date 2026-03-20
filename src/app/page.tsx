"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building, ArrowRight, LogIn } from "lucide-react";
import { ThemeToggle } from "../components/theme-toggle";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to login page when visiting root
    router.push('/auth/login');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">
        <h1 className="text-xl text-gray-600 dark:text-gray-400">Redirecting to login...</h1>
      </div>
    </div>
  );
} 