import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Backup {
  filename: string;
  timestamp: string;
  size: number;
}

export function BackupManagement() {
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);

  const { data: backups, isLoading: isLoadingBackups } = useQuery<Backup[]>({
    queryKey: ["/api/backups"],
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/backups", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Backup created successfully (CSV files zipped)",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      setIsRestoring(true);
      const response = await fetch(`/api/backups/restore/${filename}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Database restored successfully from CSV backup",
      });
      setIsRestoring(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsRestoring(false);
    },
  });

  const handleDownload = (filename: string) => {
    window.location.href = `/api/backups/download/${filename}`;
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Backup Management</CardTitle>
          <Button
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Create CSV Backup
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Backups are created as ZIP files containing CSV exports of all database tables.
          </p>
          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : backups?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell>
                      {new Date(backup.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{backup.filename}</TableCell>
                    <TableCell>{(backup.size / 1024).toFixed(2)} KB</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(backup.filename)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreBackupMutation.mutate(backup.filename)}
                        disabled={isRestoring}
                      >
                        {isRestoring ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Restore"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No backups found. Create your first backup to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}