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
        "font-mono text-xs leading-relaxed min-h-[300px] resize-none bg-secondary/50",
        "focus:ring-1 focus:ring-primary font-[JetBrains Mono],Menlo,Monaco,Consolas,monospace",
        className
      )}
      placeholder="Paste your code here..."
    />
  );
}