import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
export function Layout({ children }) {
    return (<div className="min-h-screen bg-background">
      
      <header className="border-b border-border bg-card shelf-shadow">
        <div className="container mx-auto px-4 py-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="w-6 h-6"/>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground">
                Library Book Allotment
              </h1>
              <p className="text-sm text-muted-foreground">
                Allocate books fairly based on CPI and preferences
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      
      <footer className="border-t border-border bg-card mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>Library Book Allotment System • Built with React + Tailwind</p>
        </div>
      </footer>
    </div>);
}
