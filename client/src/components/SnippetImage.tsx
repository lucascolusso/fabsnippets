interface SnippetImageProps {
  src: string;
  onError: () => void;
}

export default function SnippetImage({ src, onError }: SnippetImageProps) {
  return (
    <img 
      src={src} 
      alt="Snippet visualization" 
      className="w-full rounded-lg shadow-lg object-contain max-h-[60vh]"
      onError={onError}
      loading="lazy"
    />
  );
}
