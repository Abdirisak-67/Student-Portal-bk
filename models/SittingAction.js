const mongoose = require('mongoose');

const SittingActionSchema = new mongoose.Schema({
  type: { type: String, enum: ['faculty', 'semester', 'student'], required: true },
  refId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  actionType: { type: String, enum: ['delete', 'update'], required: true },
  data: { type: Object }, // For update, store new data
  status: { type: String, enum: ['pending', 'approved', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SittingAction', SittingActionSchema);
