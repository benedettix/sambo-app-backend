const express = require("express");

const colors = require("colors");
const cors = require("cors");
const nodemailer = require("nodemailer");
var fs = require("fs");
const serverConfig = require("../sambo-backend/config/serverConfig");
const mysqlConfig = require("../sambo-backend/config/mysqlConfig");
var jwt = require("jsonwebtoken");
const { json } = require("express");

const proxyMiddleware = require("../sambo-backend/config/setupProxy");
const app = express();
// const fileUpload = require("express-fileupload");
const path = require("path");
const multer = require("multer");
// app.use(fileUpload());
var storage = multer.diskStorage({
  destination: (req, file, callBack) => {
    callBack(null, "../sambo-frontend/public/images"); // './public/images/' directory name where save the file
  },
  filename: (req, file, callBack) => {
    callBack(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fieldSize: 10 * 1024 * 1024 },
});

// MYSQL CONNECT

var mysql = require("mysql");
const { log } = require("console");
var connection = mysql.createConnection({
  host: mysqlConfig.host,
  user: mysqlConfig.user,
  password: mysqlConfig.password,
  port: mysqlConfig.port,
  database: mysqlConfig.database,
  multipleStatements: true,
});

connection.connect(function (err) {
  if (err) {
    console.error("error connecting: " + err.stack);
  } else {
    console.log("connected as id " + connection.threadId);
  }
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// enable CORS - API calls and resource sharing
app.use(cors());
// nodmailer config
// const mailer = mainService.configureMail();

// app.use("/api/subscribe", subscribeRoute);
// app.use("/api/user", userRoute);

app.get("/", (req, res) => {
  res.send("Connected");
});

app.get("/blogovi", (req, res) => {
  connection.query("SELECT * FROM blog_posts", function (err, rows, fields) {
    if (err) {
      res.send(err);
    } else {
      res.send(rows);
    }
  });
});

app.get("/blogovi/:id", (req, res) => {
  let id = req.params.id;

  connection.query(
    `SELECT * FROM blog_posts WHERE id = ${id}`,
    function (err, row, fields) {
      if (err) {
        res.send(err);
      } else {
        res.send(row);
      }
    }
  );
});
// IMPORTOVATI SLIKU, TAGOVE, KATEGORIJE I ODRADITI ONO SA SLIKOM DA SE CUVA NA BACKEND, PA POSLE ADMIN NEKAKO DA SE SREDI
app.post(
  "/blogovi/dodajblog/uspesno",
  upload.single("img_src"),
  async (req, res) => {
    let blog = JSON.parse(req.body.blog);
    await connection.query(
      `INSERT INTO blog_posts (id, img_src, heading, date, description, likes, category, tags, created_by) VALUES (NULL, '${req.file.filename}', '${blog.heading}', '${blog.date}', '${blog.description}', '${blog.likes}', '${blog.category}','${blog.tags}','${blog.created_by}')`,
      function (err, row, fields) {
        if (err) {
          res.send(err);
        } else {
          // res.redirect("/blog");
          res.send(row);
        }
      }
    );
  }
);

app.post("/blogovi/:id/objavikomentar", (req, res) => {
  connection.query(
    `INSERT INTO comments (id, comment_name, comment_email, comment_desc, blog_id) VALUES ('NULL','${req.body.comment_name}','${req.body.comment_email}','${req.body.comment_desc}','${req.params.id}')`,
    function (err, row, fields) {
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        // res.redirect("/req.body.blog");
        res.send(row);
      }
    }
  );
});

app.get("/blogovi/komentari/:id", (req, res) => {
  connection.query(
    `SELECT * FROM comments WHERE ${req.params.id} IN (blog_id)`,
    function (err, row, fields) {
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        // res.redirect("/req.body.blog");
        res.send(row);
      }
    }
  );
});

app.post("/admin/login/uspesno", (req, res) => {
  connection.query(
    ` select * from admin_login where username in ('${req.body.username}') or password in ('${req.body.password}');`,
    function (err, row, fields) {
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        res.send(row);
        // res.redirect("/");
      }
    }
  );
});

app.get("/blogovi/editujblog/:id", (req, res) => {
  let id = req.params.id;

  connection.query(
    `SELECT * FROM blog_posts WHERE id = ${id}`,
    function (err, row, fields) {
      if (err) {
        res.send(err);
      } else {
        res.send(row);
      }
    }
  );
});

app.get("/blogovi/editujblog/komentari/:id", (req, res) => {
  connection.query(
    `SELECT * FROM comments WHERE ${req.params.id} IN (blog_id)`,
    function (err, row, fields) {
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        res.send(row);
      }
    }
  );
});

app.post("/blogovi/editujblog/azuriraj/:id", (req, res) => {
  let id = req.params.id;
  var param = [req.body, req.params.id];
  // let body = JSON.parse(req.body.blogValues);

  connection.query(
    `UPDATE blog_posts SET ? WHERE id = ?`,
    param,
    function (err, row) {
      res.redirect("/blogovi");
    }
  );
});

app.delete("/blogovi/editujblog/izbrisi/:id", (req, res) => {
  connection.query(
    `SELECT * FROM blog_posts WHERE id = ${req.params.id} `,

    async function (err, row, fields) {
      if (err) {
        console.log(err);
        // res.send(err);
      } else {
        var img = row[0].img_src;

        await connection.query(
          `DELETE FROM blog_posts WHERE id = ${req.params.id}; DELETE FROM comments WHERE blog_id = ${req.params.id}`,

          async function (err, row, fields) {
            if (err) {
              console.log(err);

              await res.send(err);
            } else {
              let DIR = "../sambo-frontend/public/images";

              fs.unlinkSync(DIR + "/" + img);
              console.log("successfully deleted");
              // return res.status(200).send('Successfully! Image has been Deleted');
              await res.send(row);
            }
          }
        );
      }
    }
  );
});

app.post("/blogovi/editujblog/izbrisi/komentar/:id", (req, res) => {
  connection.query(
    `DELETE FROM comments WHERE blog_id = ${
      req.params.id
    } and comment_email = '${req.body.val.trim()}'`,

    function (err, row, fields) {
      if (err) {
        console.log(err);

        res.send(err);
      } else {
        res.send(row);
      }
    }
  );
});

app.get("/blogovi/editujblog/postojeci/:id", (req, res) => {
  let email = req.params.id;

  connection.query(
    `SELECT * FROM comments WHERE comment_email = ?`,
    email,

    function (err, row, fields) {
      if (err) {
        console.log(err);

        res.send(err);
      } else {
        console.log(row);
        res.send(row);
      }
    }
  );
});

app.post("/kontakti/posalji", (req, res) => {
  var body = req.body;
  console.log(body);
  // let body = JSON.parse(req.body.blogValues);

  connection.query(
    `INSERT INTO contacts (id, name, email, description) VALUES (NULL, '${body.contact_name}', '${body.contact_email}', '${body.contact_desc}')`,
    function (err, row) {
      if (err) {
        console.log(err);

        res.send(err);
      } else {
        console.log(row);
        res.send(row);
      }
    }
  );
});
app.get("/prikazikontakte/kontakti", (req, res) => {
  connection.query(
    `SELECT * FROM contacts`,

    function (err, row, fields) {
      if (err) {
        console.log(err);

        res.send(err);
      } else {
        console.log(row);
        res.send(row);
      }
    }
  );
});

app.delete("/prikazikontakte/kontakti/izbrisi/:id", (req, res) => {
  connection.query(
    `DELETE FROM contacts WHERE id = ${req.params.id}`,

    function (err, row, fields) {
      if (err) {
        console.log(err);

        res.send(err);
      } else {
        console.log("successfully deleted");

        res.send(row);
      }
    }
  );
});

app.get("/galerija/uzmisliku", (req, res) => {
  connection.query(
    `SELECT * FROM blog_posts`,

    function (err, row, fields) {
      if (err) {
        console.log(err);

        res.send(err);
      } else {
        console.log(row);
        res.send(row);
      }
    }
  );
});

app.listen(serverConfig.port, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log(serverConfig.serverRunningMsg);
    console.log(serverConfig.link);
  }
});
