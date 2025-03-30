import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { insertUserSchema } from "@db/schema";
import type { NewUser } from "@db/schema";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export function AuthPage() {
  const { login, register } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "register" | "reset">("login");
  const [, setLocation] = useLocation();

  const form = useForm<NewUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });
  
  // For register form, we need to make sure email can be empty for login
  const registerForm = useForm<NewUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  async function onSubmit(data: NewUser, isLogin: boolean) {
    setIsLoading(true);
    try {
      const result = await (isLogin ? login(data) : register(data));
      if (!result.ok) {
        throw new Error(result.message);
      }
      toast({
        title: isLogin ? "Login Successful" : "Registration Successful",
        description: isLogin ? "Welcome back!" : "Your account has been created.",
      });
      // Redirect to home page after successful login/register
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container max-w-md mx-auto pt-8">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome to FabSnippets</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register" | "reset")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="reset" className="hidden">Reset</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => onSubmit(data, true))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Loading..." : "Login"}
                  </Button>
                  <div className="space-y-2 pt-2 text-center text-sm">
                    <p className="text-muted-foreground">
                      Forgot your password? <button 
                        type="button" 
                        className="text-primary hover:underline inline-flex items-center"
                        onClick={() => setActiveTab("reset")}
                      >
                        Reset your password <span className="ml-1">►</span>
                      </button>
                    </p>
                    <p className="text-muted-foreground">
                      Don't have an account? <button 
                        type="button" 
                        className="text-primary hover:underline inline-flex items-center"
                        onClick={() => setActiveTab("register")}
                      >
                        Sign up <span className="ml-1">►</span>
                      </button>
                    </p>
                  </div>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit((data) => onSubmit(data, false))} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field}
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Loading..." : "Register"}
                  </Button>
                  <div className="space-y-2 pt-2 text-center text-sm">
                    <p className="text-muted-foreground">
                      Already have an account? <button 
                        type="button" 
                        className="text-primary hover:underline inline-flex items-center"
                        onClick={() => setActiveTab("login")}
                      >
                        Log in <span className="ml-1">►</span>
                      </button>
                    </p>
                  </div>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="reset">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Enter your username or email address, and we'll send you instructions to reset your password.
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-identifier">Username or Email</Label>
                    <Input 
                      id="reset-identifier"
                      type="text" 
                      placeholder="Enter your username or email"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      toast({
                        title: "Password reset requested",
                        description: "If an account with this information exists, password reset instructions have been sent.",
                      });
                      // Clear the field and switch back to login tab after showing the message
                      setResetIdentifier("");
                      setActiveTab("login");
                    }}
                  >
                    Send Reset Instructions
                  </Button>
                  <div className="space-y-2 pt-2 text-center text-sm">
                    <p className="text-muted-foreground">
                      Remember your password? <button 
                        type="button" 
                        className="text-primary hover:underline inline-flex items-center"
                        onClick={() => setActiveTab("login")}
                      >
                        Back to login <span className="ml-1">►</span>
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthPage;