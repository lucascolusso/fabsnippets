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
        "font-mono leading-relaxed resize-none focus:ring-1 focus:ring-primary",
        "font-['JetBrains_Mono',Menlo,Monaco,Consolas,monospace]",
        "border-0 bg-[#252728]", // Explicitly set the background color and remove border
        readOnly ? "min-h-0 flex-1 text-[9px]" : "min-h-[300px] text-xs",
        className
      )}
      placeholder="Paste your code here..."
    />
  );
}