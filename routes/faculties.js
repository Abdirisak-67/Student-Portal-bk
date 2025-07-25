const express = require('express');
const Faculty = require('../models/Faculty');
const Semester = require('../models/Semester');
const SittingAction = require('../models/SittingAction');
const router = express.Router();

// Create faculty
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const faculty = await Faculty.create({ name });
    res.status(201).json(faculty);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all faculties
router.get('/', async (req, res) => {
  try {
    const faculties = await Faculty.find();
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get faculty by ID
router.get('/:id', async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Not found' });
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update faculty name
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Not found' });
    // Create pending update action
    await SittingAction.create({
      type: 'faculty',
      refId: faculty._id,
      name: faculty.name,
      actionType: 'update',
      data: { name },
      status: 'pending'
    });
    res.json({ message: 'Update request is pending approval.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete faculty
router.delete('/:id', async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Not found' });
    // Create pending delete action
    await SittingAction.create({
      type: 'faculty',
      refId: faculty._id,
      name: faculty.name,
      actionType: 'delete',
      status: 'pending'
    });
    res.json({ message: 'Delete request is pending approval.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create semester for a faculty
router.post('/:facultyId/semesters', async (req, res) => {
  try {
    const { name } = req.body;
    const { facultyId } = req.params;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const semester = await Semester.create({ name, faculty: facultyId });
    res.status(201).json(semester);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get semesters for a faculty
router.get('/:facultyId/semesters', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const semesters = await Semester.find({ faculty: facultyId });
    res.json(semesters);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
