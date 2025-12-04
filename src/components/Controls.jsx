import { motion } from "framer-motion";
import { Play, RotateCcw, Sparkles, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Controls({ onRunAllocation, onReset, onDownload, hasAllocation, isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex flex-wrap items-center gap-3"
    >
      <Button
        onClick={onRunAllocation}
        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {isLoading ? "Allocating..." : "Run Allocation"}
      </Button>
      
      <Button
        onClick={onReset}
        variant="outline"
        className="gap-2 border-border hover:bg-secondary"
        size="lg"
        disabled={!hasAllocation || isLoading}
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </Button>

      {hasAllocation && (
        <Button
          onClick={onDownload}
          variant="outline"
          className="gap-2 border-forest/30 text-forest hover:bg-forest/10"
          size="lg"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </Button>
      )}

      {hasAllocation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-2 bg-forest/10 text-forest rounded-lg text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Allocation Complete
        </motion.div>
      )}
    </motion.div>
  );
}
