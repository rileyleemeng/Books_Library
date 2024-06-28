import pg from "pg";
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app=express();
const port=3000;

const adminUsername = "riley";
const adminPassword = "11";
let sort = "title";
let data = false;

const db = new pg.Client({
    user: 'postgres',
    host: "localhost",
    database: "books_library",
    password: "mengxiang1",
    port: 5432
});
db.connect();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.get("/", async(req, res) => {
    var books = [];
    try{
        const result = await db.query(`SELECT * FROM books ORDER BY ${sort}`);
        books = result.rows;
        books.forEach((book) => {
            book.image = book.image.toString("base64");
        })
        res.render("index.ejs", {books, data});  
    }catch(err){
        console.log(err);
        res.render("index.ejs", {books, data});
        }
    });

app.post("/new", (req, res) => {
    res.render("new.ejs");
});

app.post("/sort", (req, res) => {
    sort = req.body.sort;
    res.redirect("/");
});

app.post("/add", async (req, res) => {
    const isbn=req.body.isbn;
    const title=req.body.title;
    const author=req.body.author;
    const rating=req.body.rating;
    const review=req.body.review;
    try{
        const result=await db.query("SELECT * FROM books WHERE isbn = $1", [isbn]);
        if (result.rows.length > 0){
            await db.query("UPDATE books SET rating = $1, review = $2 WHERE isbn = $3", [rating, review, isbn]);
            res.redirect("/");
        }else{
            const response= await axios.get(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`, {responseType: 'arraybuffer'});
            const image = Buffer.from(response.data, "binary");
            await db.query("INSERT INTO books(isbn, title, author, rating, review, image) VALUES($1, $2, $3, $4, $5, $6)", [isbn, title, author, rating, review, image]);
            res.redirect("/");
        }
    }
    catch(err){
        console.log(err);
    }
});

app.post("/search", async (req, res) => {
    const searchText = req.body.search;
    try{
        const result = await db.query("SELECT * FROM books WHERE title LIKE '%' || ($1) || '%';", [searchText]);
        if (result.rows.length > 0){
            const books = result.rows;
            books.forEach((book) => {
                book.image = book.image.toString("base64");
            });
            res.render("index.ejs", {books, data});
        }
        else{
            res.send("No matching books found! Please try using a different keyword.")
        }
    }catch(err){
        console.log(err);
    }
});

app.post("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/enter", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (username === adminUsername && password === adminPassword){
        data = true;
        res.redirect("/");
    }
    else{
        res.send("Incorrect username or password!");
    }
});

app.get("/book", (req, res) => {
    const isbn = req.query.isbn;
    const title = req.query.title;
    const author = req.query.author;
    const rating = req.query.rating;
    const review = req.query.review;
    const exist = {
        isbn: isbn,
        title: title,
        author: author,
        rating:rating,
        review:review
    };
    res.render("new.ejs", {exist});
});

app.get("/delete", async (req, res) => {
    const isbn = req.query.isbn; 
    try {
        await db.query("DELETE FROM books WHERE isbn=$1", [isbn]);
        res.redirect("/");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error deleting book.");
    }
});

app.get("/search/suggestions",async (req,res)=>{
    const searchText = req.query.search;
    try {
        const result=await db.query("SELECT title FROM books WHERE title LIKE '%' || $1 || '%'", [searchText]);
        if (result.rows.length > 0){
            const suggestions = result.rows.map(row => row.title);
            res.json({suggestions});
        } else {
            res.json({suggestions: []});
        }
    } catch (err) {
        console.log(err);
    }
});

app.listen(port, () => {
    console.log(`Server running at ${port}`);
});
