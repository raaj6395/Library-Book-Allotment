/**
 * Book Allocation Algorithm
 * 
 * PRIORITY ORDER OF USER GROUPS:
 * 1. MTECH FINAL year
 * 2. MTECH PRE_FINAL year
 * 3. BTECH FINAL year
 * 4. MCA FINAL year
 * 5. BTECH PRE_FINAL year
 * 6. MCA PRE_FINAL year
 * 
 * WITHIN EACH GROUP:
 * - Sort by CPI descending (higher CPI first)
 * - Tie-breaker 1: Alphabetical order by name (A-Z)
 * - Tie-breaker 2: By ID ascending
 * 
 * ALLOCATION LOGIC:
 * - Each book can only be allocated to one student
 * - Students get their highest-preference available book
 * - If no preferred books available, student remains unallocated
 */

// Define priority groups in order
const PRIORITY_GROUPS = [
  { degree: "MTECH", year: "FINAL" },
  { degree: "MTECH", year: "PRE_FINAL" },
  { degree: "BTECH", year: "FINAL" },
  { degree: "MCA", year: "FINAL" },
  { degree: "BTECH", year: "PRE_FINAL" },
  { degree: "MCA", year: "PRE_FINAL" },
];

/**
 * Compare function to sort students within a group
 * @param {Object} a - First student
 * @param {Object} b - Second student
 * @returns {number} - Sort order
 */
function compareStudents(a, b) {
  // Primary: CPI descending
  if (b.cpi !== a.cpi) {
    return b.cpi - a.cpi;
  }
  // Secondary: Name alphabetically (A-Z)
  if (a.name !== b.name) {
    return a.name.localeCompare(b.name);
  }
  // Tertiary: ID ascending
  return a.id.localeCompare(b.id);
}

/**
 * Main allocation function
 * @param {Array} users - Array of user objects
 * @param {Array} books - Array of book objects
 * @returns {Object} - Allocation results
 */
export function allocateBooks(users, books) {
  // Create a Set of valid book IDs for quick lookup
  const validBookIds = new Set(books.map(book => book.id));
  
  // Track which books are allocated
  const allocatedBooks = new Set();
  
  // Store allocation results
  const allocationsByUser = {}; // userId -> bookId or null
  const allocationsByBook = {}; // bookId -> userId or null
  
  // Initialize all books as unallocated
  books.forEach(book => {
    allocationsByBook[book.id] = null;
  });
  
  // Initialize all users as unallocated
  users.forEach(user => {
    allocationsByUser[user.id] = null;
  });
  
  // Process each priority group in order
  for (const group of PRIORITY_GROUPS) {
    // Filter users belonging to this group
    const groupUsers = users.filter(
      user => user.degree === group.degree && user.year === group.year
    );
    
    // Sort users within the group by CPI (and tie-breakers)
    groupUsers.sort(compareStudents);
    
    // Allocate books to each user in sorted order
    for (const user of groupUsers) {
      // Iterate through user's preferences
      for (const bookId of user.preferences) {
        // Skip invalid book IDs
        if (!validBookIds.has(bookId)) {
          continue;
        }
        
        // Check if book is still available
        if (!allocatedBooks.has(bookId)) {
          // Allocate this book to the user
          allocatedBooks.add(bookId);
          allocationsByUser[user.id] = bookId;
          allocationsByBook[bookId] = user.id;
          break; // Move to next user
        }
      }
      // If loop completes without allocation, user remains with null
    }
  }
  
  return {
    allocationsByUser,
    allocationsByBook,
  };
}

/**
 * Get statistics from allocation results
 * @param {Object} allocationsByUser - User allocation map
 * @param {Object} allocationsByBook - Book allocation map
 * @returns {Object} - Statistics
 */
export function getAllocationStats(allocationsByUser, allocationsByBook) {
  const totalUsers = Object.keys(allocationsByUser).length;
  const totalBooks = Object.keys(allocationsByBook).length;
  
  const allocatedUsers = Object.values(allocationsByUser).filter(v => v !== null).length;
  const allocatedBooks = Object.values(allocationsByBook).filter(v => v !== null).length;
  
  return {
    totalUsers,
    totalBooks,
    allocatedUsers,
    unallocatedUsers: totalUsers - allocatedUsers,
    allocatedBooks,
    remainingBooks: totalBooks - allocatedBooks,
  };
}
