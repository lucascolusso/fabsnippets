import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  className
}: CodeEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className={cn(
        "font-mono text-xs leading-relaxed resize-none focus:ring-1 focus:ring-primary",
        "font-['JetBrains_Mono',Menlo,Monaco,Consolas,monospace]",
        readOnly ? "min-h-0" : "min-h-[300px]",
        className
      )}
      placeholder="Paste your code here..."
    />
  );
}