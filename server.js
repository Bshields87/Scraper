var express = require("express");
var path = require('path')
var mongoose = require("mongoose");
var hbs = require('express-handlebars');

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 8080;

// Initialize Express
var app = express();
app.engine("handlebars", hbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/NewsScraper", { useNewUrlParser: true });

// Routes


app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.npr.org/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".story-text").each(function (i, element) {
      // Save an empty result object
      var result = [{}];

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .children("h3")
        .text();

      result.summary = $(this)
        .children("a")
        .children("p")
        .text()

      result.link = $(this)
        .children("a")
        .attr("href");
       
       
        result.push({title: result.title, summary: result.summary, link: result.link})
        //console.log(result)
    
      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });

    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/", function (req, res) {

  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/", function(req, res) {
  db.Article.find({})
  .then(function(data){
    //for (i=0; i < data.length; i++){ 
  var hbsObject = {
    Article: data
  }
  console.log(hbsObject)

 
    res.render("index", hbsObject)
  }).catch(function(err){
    res.json(err)
  })
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });

});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  db.Comments.create(req.body)
    .then(function (dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { comments: dbComments._id }, { new: true });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });

});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
