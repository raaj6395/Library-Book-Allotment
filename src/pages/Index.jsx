/**
 * Library Book Allotment System - Main Page
 * 
 * HOW TO RUN:
 * 1. npm install
 * 2. npm run dev
 * 
 * DATA FILES:
 * - Books: src/data/books.js
 * - Users: src/data/users.js
 * 
 * TO REPLACE WITH API:
 * Replace the imports from data files with fetch calls in useEffect hooks.
 * The allocation logic in src/utils/allocation.js is pure and will work with any data source.
 */

import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { SummarySection } from "@/components/SummaryCard";
import { Controls } from "@/components/Controls";
import { BookTable } from "@/components/BookTable";
import { UserTable } from "@/components/UserTable";
import { BOOKS } from "@/data/books";
import { USERS } from "@/data/users";
import { allocateBooks, getAllocationStats } from "@/utils/allocation";

const Index = () => {
  // State for allocation results
  const [allocationsByUser, setAllocationsByUser] = useState({});
  const [allocationsByBook, setAllocationsByBook] = useState({});
  const [hasAllocation, setHasAllocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Create lookup maps for quick access
  const usersMap = useMemo(() => {
    const map = {};
    USERS.forEach(user => {
      map[user.id] = user;
    });
    return map;
  }, []);

  const booksMap = useMemo(() => {
    const map = {};
    BOOKS.forEach(book => {
      map[book.id] = book;
    });
    return map;
  }, []);

  // Initialize allocation maps with null values
  const initializeAllocations = () => {
    const userAllocs = {};
    const bookAllocs = {};
    USERS.forEach(user => {
      userAllocs[user.id] = null;
    });
    BOOKS.forEach(book => {
      bookAllocs[book.id] = null;
    });
    return { userAllocs, bookAllocs };
  };

  // Get current allocations (initialized if empty)
  const currentAllocationsByUser = useMemo(() => {
    if (Object.keys(allocationsByUser).length === 0) {
      return initializeAllocations().userAllocs;
    }
    return allocationsByUser;
  }, [allocationsByUser]);

  const currentAllocationsByBook = useMemo(() => {
    if (Object.keys(allocationsByBook).length === 0) {
      return initializeAllocations().bookAllocs;
    }
    return allocationsByBook;
  }, [allocationsByBook]);

  // Calculate stats
  const stats = useMemo(() => {
    return getAllocationStats(currentAllocationsByUser, currentAllocationsByBook);
  }, [currentAllocationsByUser, currentAllocationsByBook]);

  // Run allocation algorithm with loading state
  const handleRunAllocation = () => {
    setIsLoading(true);
    // Simulate a small delay to show the loader
    setTimeout(() => {
      const result = allocateBooks(USERS, BOOKS);
      setAllocationsByUser(result.allocationsByUser);
      setAllocationsByBook(result.allocationsByBook);
      setHasAllocation(true);
      setIsLoading(false);
    }, 800);
  };

  // Reset to initial state
  const handleReset = () => {
    const { userAllocs, bookAllocs } = initializeAllocations();
    setAllocationsByUser(userAllocs);
    setAllocationsByBook(bookAllocs);
    setHasAllocation(false);
  };

  // Download allocation results as CSV
  const handleDownload = () => {
    const csvRows = [
      ["Student ID", "Student Name", "Degree", "Year", "CPI", "Allocated Book ID", "Allocated Book Name", "Allocated Book Author"]
    ];

    USERS.forEach(user => {
      const allocatedBookId = allocationsByUser[user.id];
      const book = allocatedBookId ? booksMap[allocatedBookId] : null;
      csvRows.push([
        user.id,
        user.name,
        user.degree,
        user.year,
        user.cpi,
        book ? book.id : "Not Allocated",
        book ? book.name : "-",
        book ? book.author : "-"
      ]);
    });

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "book_allocation_results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <section>
          <SummarySection stats={stats} />
        </section>

        {/* Controls */}
        <section>
          <Controls
            onRunAllocation={handleRunAllocation}
            onReset={handleReset}
            onDownload={handleDownload}
            hasAllocation={hasAllocation}
            isLoading={isLoading}
          />
        </section>

        {/* Tables */}
        <div className="grid lg:grid-cols-1 gap-6">
          {/* Users Table */}
          <section>
            <UserTable
              users={USERS}
              allocationsByUser={currentAllocationsByUser}
              booksMap={booksMap}
            />
          </section>

          {/* Books Table */}
          <section>
            <BookTable
              books={BOOKS}
              allocationsByBook={currentAllocationsByBook}
              usersMap={usersMap}
            />
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
