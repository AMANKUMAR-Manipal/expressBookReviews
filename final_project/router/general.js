const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const BASE_URL = "http://localhost:5000";

// ---- Axios helpers (async/await) ----
const getAllBooks = async () => (await axios.get(`${BASE_URL}/`)).data;
const getBookByISBN = async (isbn) => (await axios.get(`${BASE_URL}/isbn/${isbn}`)).data;
const getBooksByAuthor = async (author) =>
  (await axios.get(`${BASE_URL}/author/${encodeURIComponent(author)}`)).data;
const getBooksByTitle = async (title) =>
  (await axios.get(`${BASE_URL}/title/${encodeURIComponent(title)}`)).data;

// ---- Register ----
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (!isValid(username)) {
    return res.status(409).json({ message: "User already exists" });
  }
  users.push({ username, password });
  return res.status(200).json({ message: "User successfully registered. Now you can login" });
});

// ---- Get the book list (Promise) ----
public_users.get('/', function (req, res) {
  new Promise((resolve) => resolve(books))
    .then(data => res.status(200).send(JSON.stringify(data, null, 4)));
});

// ---- Get book details by ISBN (Promise) ----
public_users.get('/isbn/:isbn', function (req, res) {
  new Promise((resolve, reject) => {
    const book = books[req.params.isbn];
    book ? resolve(book) : reject("Book not found");
  })
    .then(book => res.status(200).send(JSON.stringify(book, null, 4)))
    .catch(err => res.status(404).json({ message: err }));
});

// ---- Get book details by author (Promise) ----
public_users.get('/author/:author', function (req, res) {
  new Promise((resolve, reject) => {
    const found = Object.keys(books)
      .filter(k => books[k].author === req.params.author)
      .map(k => ({ isbn: k, ...books[k] }));
    found.length ? resolve(found) : reject("No books found for this author");
  })
    .then(found => res.status(200).send(JSON.stringify({ booksbyauthor: found }, null, 4)))
    .catch(err => res.status(404).json({ message: err }));
});

// ---- Get book details by title (Promise) ----
public_users.get('/title/:title', function (req, res) {
  new Promise((resolve, reject) => {
    const found = Object.keys(books)
      .filter(k => books[k].title === req.params.title)
      .map(k => ({ isbn: k, ...books[k] }));
    found.length ? resolve(found) : reject("No books found with this title");
  })
    .then(found => res.status(200).send(JSON.stringify({ booksbytitle: found }, null, 4)))
    .catch(err => res.status(404).json({ message: err }));
});

// ---- Get book review ----
public_users.get('/review/:isbn', function (req, res) {
  const book = books[req.params.isbn];
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }
  return res.status(200).send(JSON.stringify(book.reviews, null, 4));
});

// ---- Same data fetched through Axios (async/await) ----
const viaAxios = (fetcher) => async (req, res) => {
  try {
    const data = await fetcher(req);
    return res.status(200).send(JSON.stringify(data, null, 4));
  } catch (err) {
    const status = err.response ? err.response.status : 500;
    return res.status(status).json({ message: "Request failed" });
  }
};

public_users.get('/axios/books', viaAxios(() => getAllBooks()));
public_users.get('/axios/isbn/:isbn', viaAxios(req => getBookByISBN(req.params.isbn)));
public_users.get('/axios/author/:author', viaAxios(req => getBooksByAuthor(req.params.author)));
public_users.get('/axios/title/:title', viaAxios(req => getBooksByTitle(req.params.title)));

module.exports.general = public_users;
