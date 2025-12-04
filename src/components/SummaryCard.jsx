import { motion } from "framer-motion";
import { Book, Users, CheckCircle, XCircle, BookMarked, Library } from "lucide-react";

const iconMap = {
  totalBooks: Library,
  totalUsers: Users,
  allocatedUsers: CheckCircle,
  unallocatedUsers: XCircle,
  allocatedBooks: BookMarked,
  remainingBooks: Book,
};

const labelMap = {
  totalBooks: "Total Books",
  totalUsers: "Total Students",
  allocatedUsers: "Allocated Students",
  unallocatedUsers: "Unallocated Students",
  allocatedBooks: "Books Allocated",
  remainingBooks: "Books Available",
};

const colorMap = {
  totalBooks: "bg-primary/10 text-primary",
  totalUsers: "bg-accent/10 text-accent",
  allocatedUsers: "bg-forest/10 text-forest",
  unallocatedUsers: "bg-destructive/10 text-destructive",
  allocatedBooks: "bg-gold/20 text-wood",
  remainingBooks: "bg-secondary text-secondary-foreground",
};

export function SummaryCard({ type, value, index = 0 }) {
  const Icon = iconMap[type];
  const label = labelMap[type];
  const colorClass = colorMap[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-card rounded-lg border border-border p-4 shelf-shadow hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-display font-semibold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function SummarySection({ stats }) {
  const items = [
    { type: "totalBooks", value: stats.totalBooks },
    { type: "totalUsers", value: stats.totalUsers },
    { type: "allocatedUsers", value: stats.allocatedUsers },
    { type: "unallocatedUsers", value: stats.unallocatedUsers },
    { type: "allocatedBooks", value: stats.allocatedBooks },
    { type: "remainingBooks", value: stats.remainingBooks },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((item, index) => (
        <SummaryCard key={item.type} type={item.type} value={item.value} index={index} />
      ))}
    </div>
  );
}
