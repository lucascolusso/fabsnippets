import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SelectUser } from "@db/schema";
import { toast } from "@/hooks/use-toast";

type AuthData = {
  username: string;
  password: string;
  email?: string;
};

type RequestResult = {
  ok: true;
  user: SelectUser;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: AuthData
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      return { ok: false, message };
    }

    const data = await response.json();
    return { ok: true, user: data.user };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<SelectUser | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error(await response.text());
      }

      return response.json();
    },
    staleTime: Infinity,
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: (data: AuthData) => handleRequest('/api/auth/login', 'POST', data),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: "Successfully logged in"
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: AuthData) => handleRequest('/api/auth/register', 'POST', data),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: "Successfully registered and logged in"
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => handleRequest('/api/auth/logout', 'POST'),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: "Successfully logged out"
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isAuthenticating: loginMutation.isPending || registerMutation.isPending,
  };
}
