const PRIORITY_GROUPS = [
    { degree: "MTECH", year: "FINAL" },
    { degree: "MTECH", year: "PRE_FINAL" },
    { degree: "BTECH", year: "FINAL" },
    { degree: "MCA", year: "FINAL" },
    { degree: "BTECH", year: "PRE_FINAL" },
    { degree: "MCA", year: "PRE_FINAL" },
];
function compareStudents(a, b) {
    if (b.cpi !== a.cpi) {
        return b.cpi - a.cpi;
    }
    if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
    }
    return a.id.localeCompare(b.id);
}
export function allocateBooks(users, books) {
    const validBookIds = new Set(books.map(book => book.id));
    const allocatedBooks = new Set();
    const allocationsByUser = {};
    const allocationsByBook = {};
    books.forEach(book => {
        allocationsByBook[book.id] = null;
    });
    users.forEach(user => {
        allocationsByUser[user.id] = null;
    });
    for (const group of PRIORITY_GROUPS) {
        const groupUsers = users.filter(user => user.degree === group.degree && user.year === group.year);
        groupUsers.sort(compareStudents);
        for (const user of groupUsers) {
            for (const bookId of user.preferences) {
                if (!validBookIds.has(bookId)) {
                    continue;
                }
                if (!allocatedBooks.has(bookId)) {
                    allocatedBooks.add(bookId);
                    allocationsByUser[user.id] = bookId;
                    allocationsByBook[bookId] = user.id;
                    break;
                }
            }
        }
    }
    return {
        allocationsByUser,
        allocationsByBook,
    };
}
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
