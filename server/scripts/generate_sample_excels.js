import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../../sample_data');

import { mkdirSync } from 'fs';
mkdirSync(OUT_DIR, { recursive: true });

// ─── Books Excel ──────────────────────────────────────────────────────────────
async function generateBooksExcel() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Books');

  ws.columns = [
    { header: 'Title',             key: 'title',             width: 40 },
    { header: 'Author',            key: 'author',            width: 25 },
    { header: 'Class No',          key: 'classNo',           width: 15 },
    { header: 'ISBN',              key: 'isbn',              width: 20 },
    { header: 'Total Copies',      key: 'totalCopies',       width: 14 },
    { header: 'Available Copies',  key: 'availableCopies',   width: 18 },
    { header: 'Category',          key: 'category',          width: 20 },
    { header: 'Description',       key: 'description',       width: 40 },
  ];

  // Bold header row
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };

  const books = [
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', classNo: '005.1 COR', isbn: 'ISBN-0262033844', totalCopies: 5, availableCopies: 5, category: 'Computer Science', description: 'Comprehensive textbook on algorithms.' },
    { title: 'Data Structures and Algorithms in Python', author: 'Michael T. Goodrich', classNo: '005.13 GOO', isbn: 'ISBN-1118290275', totalCopies: 4, availableCopies: 4, category: 'Computer Science', description: 'Python-based data structures guide.' },
    { title: 'Operating System Concepts', author: 'Abraham Silberschatz', classNo: '005.43 SIL', isbn: 'ISBN-1119800366', totalCopies: 6, availableCopies: 6, category: 'Operating Systems', description: 'Classic OS textbook (Dinosaur book).' },
    { title: 'Database System Concepts', author: 'Abraham Silberschatz', classNo: '005.74 SIL', isbn: 'ISBN-0073523321', totalCopies: 4, availableCopies: 4, category: 'Databases', description: 'Comprehensive DBMS textbook.' },
    { title: 'Computer Networks', author: 'Andrew S. Tanenbaum', classNo: '004.6 TAN', isbn: 'ISBN-0132126958', totalCopies: 5, availableCopies: 5, category: 'Networking', description: 'Top-down approach to computer networking.' },
    { title: 'Discrete Mathematics and Its Applications', author: 'Kenneth H. Rosen', classNo: '511.1 ROS', isbn: 'ISBN-0073383090', totalCopies: 8, availableCopies: 8, category: 'Mathematics', description: 'Discrete math for CS students.' },
    { title: 'Linear Algebra and Its Applications', author: 'Gilbert Strang', classNo: '512.5 STR', isbn: 'ISBN-0030105676', totalCopies: 6, availableCopies: 6, category: 'Mathematics', description: 'Intuitive approach to linear algebra.' },
    { title: 'Signals and Systems', author: 'Alan V. Oppenheim', classNo: '621.382 OPP', isbn: 'ISBN-0138147574', totalCopies: 4, availableCopies: 4, category: 'Electronics', description: 'Comprehensive signals and systems text.' },
    { title: 'Engineering Mathematics', author: 'B.S. Grewal', classNo: '510 GRE', isbn: 'ISBN-8174091955', totalCopies: 10, availableCopies: 10, category: 'Mathematics', description: 'Standard engineering mathematics text.' },
    { title: 'Compiler Design', author: 'Alfred V. Aho', classNo: '005.453 AHO', isbn: 'ISBN-0321486811', totalCopies: 3, availableCopies: 3, category: 'Computer Science', description: 'The Dragon Book on compiler design.' },
    { title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell', classNo: '006.3 RUS', isbn: 'ISBN-0136042597', totalCopies: 4, availableCopies: 4, category: 'Artificial Intelligence', description: 'Definitive AI textbook.' },
    { title: 'Machine Learning', author: 'Tom M. Mitchell', classNo: '006.31 MIT', isbn: 'ISBN-0070428077', totalCopies: 3, availableCopies: 3, category: 'Artificial Intelligence', description: 'Classic ML textbook.' },
    { title: 'Computer Architecture: A Quantitative Approach', author: 'John L. Hennessy', classNo: '004.22 HEN', isbn: 'ISBN-0123838728', totalCopies: 3, availableCopies: 3, category: 'Computer Architecture', description: 'Patterson & Hennessy architecture text.' },
    { title: 'Software Engineering', author: 'Ian Sommerville', classNo: '005.1 SOM', isbn: 'ISBN-0137035152', totalCopies: 5, availableCopies: 5, category: 'Software Engineering', description: 'Comprehensive software engineering text.' },
    { title: 'Design Patterns', author: 'Erich Gamma', classNo: '005.12 GAM', isbn: 'ISBN-0201633612', totalCopies: 3, availableCopies: 3, category: 'Software Engineering', description: 'Gang of Four design patterns.' },
  ];

  for (const b of books) ws.addRow(b);

  const filePath = path.join(OUT_DIR, 'sample_books.xlsx');
  await wb.xlsx.writeFile(filePath);
  console.log('✅ Books Excel created:', filePath);
}

// ─── Student Excels (BTech + MCA) ─────────────────────────────────────────────
async function generateStudentExcel(filename, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');

  ws.columns = [
    { header: 'Reg No',  key: 'regNo',  width: 18 },
    { header: 'Name',    key: 'name',   width: 28 },
    { header: 'Email',   key: 'email',  width: 32 },
    { header: 'CPI',     key: 'cpi',    width: 8  },
    { header: 'Branch',  key: 'branch', width: 20 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' },
  };

  for (const r of rows) ws.addRow(r);

  const filePath = path.join(OUT_DIR, filename);
  await wb.xlsx.writeFile(filePath);
  console.log('✅ Student Excel created:', filePath);
}

const btechBranches = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'];
const mcaBranches   = ['MCA'];

function randCpi() {
  return parseFloat((Math.random() * 4 + 6).toFixed(2)); // 6.00–10.00
}

function makeStudents(prefix, count, branch, year) {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(3, '0');
    const br = Array.isArray(branch) ? branch[i % branch.length] : branch;
    return {
      regNo:  `${prefix}${n}`,
      name:   `Student ${prefix}${n}`,
      email:  `student.${prefix.toLowerCase()}${n}@mnnit.ac.in`,
      cpi:    randCpi(),
      branch: br,
    };
  });
}

async function main() {
  await generateBooksExcel();

  // BTech – 1st Year (2024 batch)
  await generateStudentExcel(
    'sample_students_btech_1st_year.xlsx',
    makeStudents('2024CSE', 10, btechBranches, '1st Year')
      .concat(makeStudents('2024ECE', 8, 'ECE', '1st Year'))
  );

  // BTech – 2nd Year
  await generateStudentExcel(
    'sample_students_btech_2nd_year.xlsx',
    makeStudents('2023CS', 10, 'CSE', '2nd Year')
      .concat(makeStudents('2023EC', 8, 'ECE', '2nd Year'))
  );

  // BTech – 3rd Year
  await generateStudentExcel(
    'sample_students_btech_3rd_year.xlsx',
    makeStudents('2022CS', 10, 'CSE', '3rd Year')
      .concat(makeStudents('2022ME', 6, 'ME', '3rd Year'))
  );

  // BTech – 4th Year
  await generateStudentExcel(
    'sample_students_btech_4th_year.xlsx',
    makeStudents('2021CS', 10, 'CSE', '4th Year')
      .concat(makeStudents('2021EE', 7, 'EE', '4th Year'))
  );

  // MCA – 1st Year
  await generateStudentExcel(
    'sample_students_mca_1st_year.xlsx',
    makeStudents('MCA2024', 15, 'MCA', '1st Year')
  );

  // MCA – 2nd Year
  await generateStudentExcel(
    'sample_students_mca_2nd_year.xlsx',
    makeStudents('MCA2023', 12, 'MCA', '2nd Year')
  );

  // MCA – 3rd Year
  await generateStudentExcel(
    'sample_students_mca_3rd_year.xlsx',
    makeStudents('MCA2022', 10, 'MCA', '3rd Year')
  );

  console.log('\n📁 All files saved to: sample_data/');
}

main().catch(console.error);
