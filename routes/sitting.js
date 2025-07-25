const express = require('express');
const router = express.Router();
const SittingAction = require('../models/SittingAction');
const Faculty = require('../models/Faculty');
const Semester = require('../models/Semester');
const Student = require('../models/Student');

// Get all pending actions
router.get('/', async (req, res) => {
  const actions = await SittingAction.find().sort({ createdAt: -1 });
  res.json(actions);
});

// Approve or cancel an action
router.post('/:id/action', async (req, res) => {
  const { action } = req.body;
  const sittingAction = await SittingAction.findById(req.params.id);
  if (!sittingAction || sittingAction.status !== 'pending') return res.status(404).json({ error: 'Not found or already processed' });

  if (action === 'approved') {
    // Perform the action
    if (sittingAction.type === 'faculty') {
      if (sittingAction.actionType === 'delete') await Faculty.findByIdAndDelete(sittingAction.refId);
      if (sittingAction.actionType === 'update') await Faculty.findByIdAndUpdate(sittingAction.refId, sittingAction.data);
    }
    if (sittingAction.type === 'semester') {
      if (sittingAction.actionType === 'delete') await Semester.findByIdAndDelete(sittingAction.refId);
      if (sittingAction.actionType === 'update') await Semester.findByIdAndUpdate(sittingAction.refId, sittingAction.data);
    }
    if (sittingAction.type === 'student') {
      if (sittingAction.actionType === 'delete') await Student.findByIdAndDelete(sittingAction.refId);
      if (sittingAction.actionType === 'update') await Student.findByIdAndUpdate(sittingAction.refId, sittingAction.data);
    }
    sittingAction.status = 'approved';
  } else if (action === 'cancelled') {
    sittingAction.status = 'cancelled';
  }
  await sittingAction.save();
  res.json(sittingAction);
});

module.exports = router;
