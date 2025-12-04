import { motion } from "framer-motion";
import { Book, CheckCircle2, Circle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function BookTable({ books, allocationsByBook, usersMap }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-card rounded-lg border border-border shelf-shadow overflow-hidden"
    >
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-semibold text-foreground">Books Inventory</h2>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Title</TableHead>
              <TableHead className="font-semibold">Author</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Allocated To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.map((book, index) => {
              const allocatedUserId = allocationsByBook[book.id];
              const allocatedUser = allocatedUserId ? usersMap[allocatedUserId] : null;
              const isAllocated = allocatedUserId !== null;

              return (
                <motion.tr
                  key={book.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {book.id}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {book.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {book.author}
                  </TableCell>
                  <TableCell>
                    {isAllocated ? (
                      <Badge className="bg-forest/10 text-forest border-forest/20 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Allocated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Circle className="w-3 h-3" />
                        Available
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {allocatedUser ? (
                      <span className="text-sm">
                        <span className="font-medium text-foreground">{allocatedUser.name}</span>
                        <span className="text-muted-foreground"> ({allocatedUser.id})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
