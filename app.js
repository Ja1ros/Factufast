const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const port = process.env.PORT || 4000;
const moment = require('moment');
moment.locale('es');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use('/uploads', express.static('uploads'));

const dbConfig = {
  host: 'srv1180.hstgr.io',
  user: 'u585281285_UFact',
  password: 'Ambato24$',
  database: 'u585281285_DBFact'
};

const pool = mysql.createPool(dbConfig);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join('/home/u585281285/domains/simaritech.com/public_html/inv/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  pool.query('SELECT * FROM facturas ORDER BY date DESC LIMIT 5', (err, results) => {
    if (err) throw err;
    res.render('index', { facturas: results });
  });
});

// app.get('/list', (req, res) => {
//   const { startDate, endDate } = req.query;
//   if (startDate && endDate) {
//     pool.query('SELECT * FROM facturas WHERE date BETWEEN ? AND ? ORDER BY date DESC', [startDate, endDate], (err, results) => {
//       if (err) throw err;
//       res.render('list', { facturas: results });
//     });
//   } else {
//     res.render('list', { facturas: [] });
//   }
// });

app.get('/list', (req, res) => {
  const { startDate, endDate, category } = req.query;

  let query = `
    SELECT category, title, date, image_url, valor
    FROM facturas 
    WHERE date BETWEEN ? AND ?
  `;

  const params = [startDate, endDate];

  if (category) {
    if (Array.isArray(category)) {
      query += ` AND category IN (?)`;
      params.push(category);
    } else {
      query += ` AND category = ?`;
      params.push(category);
    }
  }

  query += ` ORDER BY category, date DESC`;

  pool.query(query, params, (err, results) => {
    if (err) throw err;

    const categoryMap = {
      Categoria1: 'Comida',
      Categoria2: 'Bancos',
      Categoria3: 'Servicios',
      Categoria4: 'Belleza y Salud',
      Categoria5: 'Ropa y varios',
    };

    const facturas = results.map(factura => ({
      ...factura,
      category: categoryMap[factura.category],
      formattedDate: moment(factura.date).format('dddd, D [de] MMMM')  // Formato de fecha
    }));

    // Calcular el total general
    const totalGeneral = facturas.reduce((acc, factura) => acc + factura.valor, 0);

    res.render('list', { facturas, totalGeneral });
  });
});



app.get('/new', (req, res) => {
  res.render('new');
});

app.post('/new-entry', upload.single('image'), (req, res) => {
  const { title, category, valor, date } = req.body;
  // const image_url = `/uploads/${req.file.filename}`;
  const image_url = `https://srv1180-files.hstgr.io/31776f30a63414d4/files/public_html/inv/uploads/${req.file.filename}`;

  const factura = { title, category, valor, image_url, date };

  const query = 'INSERT INTO facturas SET ?';
  pool.query(query, factura, (err, result) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.post('/edit-entry/:id', upload.single('image'), (req, res) => {
  const { title, category, valor, date } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.existingImage;
  const factura = { title, category, valor, image_url, date };

  const query = 'UPDATE facturas SET ? WHERE id = ?';
  pool.query(query, [factura, req.params.id], (err, result) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.post('/delete-entry/:id', (req, res) => {
  const query = 'DELETE FROM facturas WHERE id = ?';
  pool.query(query, [req.params.id], (err, result) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log('Server running on port');
});
