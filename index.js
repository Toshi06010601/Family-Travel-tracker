import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Nakamura0601",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const getUsers = async () => {
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

let currentUserId = 1;

const getCurrentUser = async () => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [currentUserId]);
  return result.rows[0];
}

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN countries ON countries.id = country_id WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const users = await getUsers();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.user_color,
  });
});

//Get country code and add it to visited_countries table
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT id, country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryId = data.id;
    try {
      await db.query(
        "INSERT INTO visited_countries (user_id, country_id) VALUES ($1, $2)",
        [currentUserId, countryId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

//Once user tab is clicked, get userID and refresh the page
app.post("/user", async (req, res) => {
  
  if(req.body.user != null) {
    //get clicked user and show that specific user travel tracker map
    currentUserId = req.body.user;
    res.redirect("/");
  } else {
    //if add family menmber is clicked, navigate to new.ejs
    res.render("new.ejs");
  }

});

//Add user name and user color
app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  console.log(name, color);
  const result = await db.query("INSERT INTO users (user_name, user_color) VALUES($1, $2) RETURNING *", [name, color]);
  currentUserId = result.rows[0].id;
  console.log(currentUserId);
  res.redirect("/");
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
