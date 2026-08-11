import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';


const router = express.Router();
const upload = multer({ dest: 'uploads/' });
  // { fieldname: 'file', originalname: 'data.csv', path: 'uploads/xxxxx', size: 1234, ... }

router.post('/csv-xlsx', upload.single('file'), (req, res) => {
  const file= req.file;

});

module.exports = router;