const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: String,
  lecture: String,
  activity1: Number,
  midExam: Number,
  activity2: Number,
  final: Number,
  total: Number,
});



const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true }, // unique student identifier
  name: { type: String, required: true },
  normalizedName: { type: String, required: true, index: true }, // for duplicate detection
  phone: { type: String },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  subjects: [subjectSchema],
}, { timestamps: true });

studentSchema.index({ studentId: 1, faculty: 1, semester: 1 }, { unique: true });
studentSchema.index({ normalizedName: 1, faculty: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
