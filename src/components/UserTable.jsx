import { motion } from "framer-motion";
import { Users, GraduationCap, Award } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
const degreeColors = {
    MTECH: "bg-primary/10 text-primary border-primary/20",
    BTECH: "bg-accent/10 text-accent border-accent/20",
    MCA: "bg-gold/20 text-wood border-gold/30",
};
const yearColors = {
    FINAL: "bg-forest/10 text-forest border-forest/20",
    PRE_FINAL: "bg-secondary text-secondary-foreground border-border",
};
export function UserTable({ users, allocationsByUser, booksMap }) {
    const priorityOrder = [
        { degree: "MTECH", year: "FINAL" },
        { degree: "MTECH", year: "PRE_FINAL" },
        { degree: "BTECH", year: "FINAL" },
        { degree: "MCA", year: "FINAL" },
        { degree: "BTECH", year: "PRE_FINAL" },
        { degree: "MCA", year: "PRE_FINAL" },
    ];
    const getPriority = (user) => {
        const idx = priorityOrder.findIndex(p => p.degree === user.degree && p.year === user.year);
        return idx === -1 ? 999 : idx;
    };
    const sortedUsers = [...users].sort((a, b) => {
        const priorityDiff = getPriority(a) - getPriority(b);
        if (priorityDiff !== 0)
            return priorityDiff;
        return b.cpi - a.cpi;
    });
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="bg-card rounded-lg border border-border shelf-shadow overflow-hidden">
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary"/>
          <h2 className="text-lg font-display font-semibold text-foreground">Students</h2>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Degree</TableHead>
              <TableHead className="font-semibold">Year</TableHead>
              <TableHead className="font-semibold">CPI</TableHead>
              <TableHead className="font-semibold">Preferences</TableHead>
              <TableHead className="font-semibold">Allocation Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user, index) => {
            const allocatedBookId = allocationsByUser[user.id];
            const allocatedBook = allocatedBookId ? booksMap[allocatedBookId] : null;
            const isAllocated = allocatedBookId !== null;
            return (<motion.tr key={user.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: index * 0.02 }} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {user.id}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {user.name}
                      {user.cpi >= 9.0 && (<Award className="w-4 h-4 text-gold" title="High CPI"/>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={degreeColors[user.degree]}>
                      <GraduationCap className="w-3 h-3 mr-1"/>
                      {user.degree}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={yearColors[user.year]}>
                      {user.year.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${user.cpi >= 9.0 ? "text-forest" : "text-foreground"}`}>
                      {user.cpi.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.preferences.slice(0, 4).map((bookId, i) => (<span key={bookId} className={`text-xs px-1.5 py-0.5 rounded ${allocatedBookId === bookId
                        ? "bg-forest/20 text-forest font-medium"
                        : "bg-muted text-muted-foreground"}`}>
                          {bookId}
                        </span>))}
                      {user.preferences.length > 4 && (<span className="text-xs text-muted-foreground">
                          +{user.preferences.length - 4}
                        </span>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isAllocated ? (<div className="flex items-center gap-2">
                        <Badge className="bg-forest/10 text-forest border-forest/20">
                          Allocated
                        </Badge>
                        <span className="text-sm">
                          <span className="font-mono text-muted-foreground">{allocatedBookId}</span>
                          {allocatedBook && (<span className="text-foreground"> – {allocatedBook.name}</span>)}
                        </span>
                      </div>) : (<Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
                        Not Allocated
                      </Badge>)}
                  </TableCell>
                </motion.tr>);
        })}
          </TableBody>
        </Table>
      </div>
    </motion.div>);
}
