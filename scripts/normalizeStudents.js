const mongoose = require('mongoose');
const Student = require('../models/Student');

const normalize = str => str.trim().replace(/\s+/g, ' ').toLowerCase();

async function run() {
  await mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME'); // <-- update with your DB name or connection string
  const students = await Student.find();
  for (const student of students) {
    student.normalizedName = normalize(student.name);
    await student.save();
  }
  console.log('All students normalized!');
  process.exit();
}

run();
