import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SnippetImageProps {
  src: string;
  onError: () => void;
}

export default function SnippetImage({ src, onError }: SnippetImageProps) {
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(src);
  
  // Add a timestamp to bust the cache and force a fresh load
  useEffect(() => {
    // Only add cache-busting if it's an upload URL
    if (src.startsWith('/uploads/')) {
      setImageSrc(`${src}?t=${Date.now()}`);
    } else {
      setImageSrc(src);
    }
  }, [src]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    onError();
  };

  return (
    <div className="relative">
      {loading && (
        <Skeleton className="w-full h-[300px] rounded-lg absolute top-0 left-0" />
      )}
      <img 
        src={imageSrc} 
        alt="Snippet visualization" 
        className="w-full rounded-lg shadow-lg object-contain max-h-[60vh]"
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />
    </div>
  );
}
