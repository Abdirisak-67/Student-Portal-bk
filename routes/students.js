const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Semester = require('../models/Semester');
const SittingAction = require('../models/SittingAction');
const router = express.Router();
const Hashids = require('hashids/cjs');
const hashids = new Hashids('your-salt', 10); // Use the same salt and length as frontend

// Register student (single) - prevent duplicate student for same faculty+semester+name
// Bulk register students
router.post('/bulk', async (req, res) => {
  const students = req.body.students || req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ message: 'Invalid data format. Expected array of students.' });
  }
  let added = 0, updated = 0, errors = 0;
  const errorDetails = [];
  for (const [i, student] of students.entries()) {
    const { studentId, name, phone, faculty, semester } = student;
    if (!studentId || !name || !faculty || !semester) {
      errors++;
      errorDetails.push({ row: i + 2, error: 'Missing student ID, name, faculty, or semester' });
      continue;
    }
    try {
      // Normalize name
      const normalize = str => str.trim().replace(/\s+/g, ' ').toLowerCase();
      const normalizedName = normalize(name);
      // Check if student exists
      let exists = await Student.findOne({ studentId, faculty, semester });
      if (exists) {
        updated++;
        // Optionally update phone/name
        exists.name = name;
        exists.normalizedName = normalizedName;
        exists.phone = phone;
        await exists.save();
      } else {
        await Student.create({ studentId, name, normalizedName, phone, faculty, semester });
        added++;
      }
    } catch (err) {
      errors++;
      errorDetails.push({ row: i + 2, error: err.message });
    }
  }
  res.json({ added, updated, errors, errorDetails });
});
router.post('/', async (req, res) => {
  try {
    const { studentId, name, phone, faculty, semester } = req.body;
    if (!studentId || !name || !faculty || !semester) return res.status(400).json({ message: 'All fields required' });
    // Normalize name: trim, collapse spaces, lowercase
    const normalize = str => str.trim().replace(/\s+/g, ' ').toLowerCase();
    const normalizedName = normalize(name);
    // Check if student already exists for this faculty+semester+studentId
    const exists = await Student.findOne({ studentId, faculty, semester });
    if (exists) {
      return res.status(409).json({ message: 'Student already exists for this faculty and semester' });
    }
    const student = await Student.create({ studentId, name, normalizedName, phone, faculty, semester });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().populate('faculty').populate('semester');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student by ID
// Get student by MongoDB _id
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('faculty').populate('semester');
    if (!student) return res.status(404).json({ message: 'Not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student by studentId (for portal)
router.get('/studentid/:studentId', async (req, res) => {
  try {
    let realStudentId;
    // Try decodeHex for string IDs
    const decodedHex = hashids.decodeHex(req.params.studentId);
    if (decodedHex) {
      realStudentId = decodedHex;
      console.log('Decoded hex studentId:', req.params.studentId, '->', realStudentId);
    } else {
      // fallback for old numeric hashes
      const decoded = hashids.decode(req.params.studentId);
      if (decoded.length) {
        realStudentId = decoded[0].toString();
        console.log('Decoded numeric hashid:', req.params.studentId, '->', realStudentId);
      } else {
        // Fallback: treat as raw studentId
        realStudentId = req.params.studentId;
        console.log('Fallback to raw studentId:', realStudentId);
      }
    }
    const student = await Student.findOne({ studentId: realStudentId }).populate('faculty').populate('semester');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Search students by name, faculty, and semester
router.get('/search', async (req, res) => {
  try {
    const { name, faculty, semester } = req.query;
    const filter = {};
    if (name && typeof name === 'string' && name.trim()) {
      let safeName;
      try {
        // Fix regex: escape dash and all special chars, and handle unicode
        safeName = name.trim().replace(/[.*+?^${}()|[\]\\\-]/g, '\\$&');
      } catch (e) {
        return res.status(400).json({ message: 'Invalid search input', error: e.message });
      }
      filter.name = { $regex: safeName, $options: 'i' };
    }
    // Only add faculty/semester if valid
    if (faculty && mongoose.Types.ObjectId.isValid(faculty)) filter.faculty = faculty;
    if (semester && mongoose.Types.ObjectId.isValid(semester)) filter.semester = semester;
    // Defensive: log filter and query
    // console.log('Student search filter:', filter);
    const students = await Student.find(filter).populate('faculty').populate('semester');
    res.json(students);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete student by ID
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Not found' });
    // Create pending delete action
    await SittingAction.create({
      type: 'student',
      refId: student._id,
      name: student.name,
      actionType: 'delete',
      status: 'pending'
    });
    res.json({ message: 'Delete request is pending approval.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, faculty, semester, subjects } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Not found' });
    student.name = name;
    student.faculty = faculty;
    student.semester = semester;
    student.subjects = subjects;
    await student.save();
    res.json({ message: 'Student updated successfully!', student });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add or update subject for a student (no duplicate students or subjects)
router.post('/add-subject', async (req, res) => {
  try {
    let { studentId, name, phone, faculty, semester, subject } = req.body;
    if (!studentId || !name || !faculty || !semester || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    // Normalize name: trim, collapse spaces, lowercase
    const normalize = str => str.trim().replace(/\s+/g, ' ').toLowerCase();
    const normalizedName = normalize(name);
    // Find student by studentId, faculty, semester
    let student = await Student.findOne({ studentId, faculty, semester });
    if (student) {
      // Remove any duplicate subjects by name (case-insensitive)
      student.subjects = student.subjects.filter((subj, idx, arr) =>
        arr.findIndex(s => s.name.toLowerCase() === subj.name.toLowerCase()) === idx
      );
      // Check if subject already exists for this student
      const exists = student.subjects.some(s => s.name.toLowerCase() === subject.name.toLowerCase());
      if (exists) {
        return res.status(409).json({ message: 'Subject already exists for this student' });
      }
      student.subjects.push(subject);
      // Deduplicate again after push (in case of race conditions)
      student.subjects = student.subjects.filter((subj, idx, arr) =>
        arr.findIndex(s => s.name.toLowerCase() === subj.name.toLowerCase()) === idx
      );
      await student.save();
      return res.json({ message: 'Subject added to existing student', student });
    } else {
      // Only use the provided subject for new students (no reference to 'subjects' variable)
      const uniqueSubjects = [subject];
      student = await Student.create({ studentId, name, normalizedName, phone, faculty, semester, subjects: uniqueSubjects });
      return res.status(201).json({ message: 'New student created', student });
    }
  } catch (err) {
    console.error('Bulk add-subject error:', err);
    res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
  }
});

// Get all students for a specific semester
router.get('/semester/:semesterId', async (req, res) => {
  try {
    const { semesterId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(semesterId)) {
      return res.status(400).json({ message: 'Invalid semester ID' });
    }
    const students = await Student.find({ semester: semesterId }).populate('faculty').populate('semester');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students for a specific semester and faculty (strict)
router.get('/faculty/:facultyId/semester/:semesterId', async (req, res) => {
  try {
    const { facultyId, semesterId } = req.params;
    if (!facultyId || !semesterId) {
      return res.status(400).json({ message: 'Missing facultyId or semesterId' });
    }
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      return res.status(400).json({ message: 'Invalid facultyId' });
    }
    if (!mongoose.Types.ObjectId.isValid(semesterId)) {
      return res.status(400).json({ message: 'Invalid semesterId' });
    }
    // Debug: log the query
    console.log('Querying students with:', { faculty: facultyId, semester: semesterId });
    const students = await Student.find({ faculty: facultyId, semester: semesterId }).populate('faculty').populate('semester');
    console.log('Found students:', students.map(s => ({ name: s.name, faculty: s.faculty._id, semester: s.semester._id })));
    res.json(students);
  } catch (err) {
    console.error('Error in /faculty/:facultyId/semester/:semesterId:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Find students by last 4 digits of studentId
router.get('/last4/:digits', async (req, res) => {
  const { digits } = req.params;
  if (!/^[0-9]{4}$/.test(digits)) {
    return res.status(400).json({ message: 'Invalid last 4 digits' });
  }
  try {
    // Use regex to match last 4 digits
    const students = await Student.find({ studentId: { $regex: digits + '$' } });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
