import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Password reset form schema
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    setToken(tokenParam);
    
    // Verify token validity
    if (tokenParam) {
      verifyToken(tokenParam);
    } else {
      setIsVerifying(false);
      toast({
        variant: "destructive",
        title: "Invalid Request",
        description: "No reset token provided. Please request a new password reset.",
      });
    }
  }, []);

  // Verify token with the server
  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`/api/password-reset/verify?token=${token}`);
      const data = await response.json();
      
      setIsTokenValid(data.valid);
      setIsVerifying(false);
      
      if (!data.valid) {
        toast({
          variant: "destructive",
          title: "Invalid or Expired Token",
          description: "This password reset link is invalid or has expired. Please request a new one.",
        });
      }
    } catch (error) {
      setIsVerifying(false);
      setIsTokenValid(false);
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: "Could not verify the reset token. Please try again.",
      });
    }
  };

  // Submit new password
  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;
    
    setIsResetting(true);
    
    try {
      const response = await fetch("/api/password-reset/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated. You can now login with your new password.",
        });
        
        // Redirect to login page after successful reset
        setTimeout(() => {
          setLocation("/auth");
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Reset Failed",
          description: result.message || "Failed to reset password. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while resetting your password. Please try again."
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Show loading state
  if (isVerifying) {
    return (
      <div className="container max-w-md mx-auto pt-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Verifying Reset Link</CardTitle>
            <CardDescription className="text-center">
              Please wait while we verify your password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4 pb-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state for invalid token
  if (!isTokenValid) {
    return (
      <div className="container max-w-md mx-auto pt-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Invalid Reset Link</CardTitle>
            <CardDescription className="text-center">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Please request a new password reset link from the login page.
            </p>
            <Button 
              className="w-full" 
              onClick={() => setLocation("/auth")}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className="container max-w-md mx-auto pt-8">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;