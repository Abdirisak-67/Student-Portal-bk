const express = require('express');
const Semester = require('../models/Semester');
const SittingAction = require('../models/SittingAction');
const router = express.Router();

// Get semester by ID
router.get('/:id', async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ message: 'Not found' });
    res.json(semester);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update semester name
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ message: 'Not found' });
    // Create pending update action
    await SittingAction.create({
      type: 'semester',
      refId: semester._id,
      name: semester.name,
      actionType: 'update',
      data: { name },
      status: 'pending'
    });
    res.json({ message: 'Update request is pending approval.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete semester
router.delete('/:id', async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ message: 'Not found' });
    // Create pending delete action
    await SittingAction.create({
      type: 'semester',
      refId: semester._id,
      name: semester.name,
      actionType: 'delete',
      status: 'pending'
    });
    res.json({ message: 'Delete request is pending approval.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
