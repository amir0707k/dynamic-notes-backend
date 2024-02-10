const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const KEY = crypto.randomBytes(32).toString("hex");

app.use(cors());
app.use(bodyParser.json())
mongoose
  .connect(
    "mongodb+srv://amir0707k:%40mir0707K@cluster0.lo5qoez.mongodb.net/notes",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connection successful"))
  .catch((err) => console.log(err));

const Schema = mongoose.Schema;

const noteSchema = new Schema({
  title: String,
  note: String,
  key:String,
  background:String,
  username: String,
  _id:String
});

const userSchema = Schema({
  username: String,
  password: String,
});

const Note = mongoose.model("Note", noteSchema);
const Users = mongoose.model("Users", userSchema);


const userAuthentication = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    console.log(token)
    
    jwt.verify(token, KEY, (err, user) => {
      
      if (err) {
        console.log("line 52",err);
        return res.status(403).json({
          message:"User not logged in !"
        });
      }else{
        console.log(user)
        req.user = user;
        next();
      }
    });
  } else {
    return res.status(403).json({
      message: "User doesn't exist",
    });
  }
};

app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.post("/signup", async (req, res) => {
    console.log(req.body)
  const { username, password } = req.body;
  try {
    const user = await Users.findOne({ username });
    if (user) {
      return res.status(400).json({
        message: "User already exists!",
      });
    } else {
      const newUser = new Users({
        username,
        password,
      });
      const token = jwt.sign(
        {
          username,
          password,
        },
        KEY,
        { expiresIn: "24h" }
      );
      newUser
        .save()
        .then((user) => console.log(user))
        .catch((err) => console.log(err));

      res.json({
        message: "User created successfully",
        token,
      });
    }
  } catch (error){
        console.log(error)
  }
});

app.post("/login", async (req, res) => {
    
    const {username, password} = req.body;
    const user = await Users.findOne({username, password});
    if(user){
        const token = jwt.sign({username, password}, KEY, {expiresIn:"24h"})

        res.status(200).json({
          message: "Logged in Successfully",
          token
        });
    }else{
        res.status(403).json({
            message:"Invalid username or password"
        })
    }
});

app.post("/notes",userAuthentication, async (req,res) => {
    const { title, note, background, id } = req.body;
    const username = req.user.username;

    try{
        const newNote = new Note({
            title, note, background, _id:id, username
        })
        await newNote.save();
        console.log(newNote)
        res.status(201).json({
            message: "Note created successfully"
        });
    }
    catch(e){
        console.log(e);
        res.status(500).json({
            message: "Internal server error"
        });
    }
})

app.get("/notes", userAuthentication, (req, res) => {
    const username = req.user.username;
  console.log(username)
    console.log("API HIT")
  Note.find({username})
    .then((notes) => {
      if(notes.length >0){
        const formattedNotes = notes.map((note) => ({
          id: note._id,
          title: note.title,
          note: note.note,
          background: note.background,
        }));
        res.json(formattedNotes);
      }else{
        res.status(204).json({
          message:"No notes available",
          data:[]
        });
        return
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error retreiving notes",
      });
    });
});

app.put('/notes/:id', userAuthentication, async (req,res) => {
  const noteId = req.params.id;
  console.log(noteId);
  const {username} = req.user;
  const {title, note, background, key} = req.body;
  try{
    const updatedNote = await Note.findOneAndUpdate({
      _id:noteId,username
    }, {title, note, background, key},
    {new:true});

    if(!updatedNote){
      return res.status(404).json({
        message:"Note not found or does not belong to the user"
      })
    }
    res.status(200).json({
      message:"Note updated successfully", updatedNote
    })
    console.log(updatedNote);
  }catch(e){
    console.error("Error:", e);
    res.status(500).json({
      message:"Internal server error"
    });
  }
})

app.get("/notes/search", userAuthentication, async (req, res) => {
  const query = req.query.search;
  console.log(query);
  const {username} = req.user;
  try{
    const searchList = [];
    const notes = await Note.find({username});

    notes.forEach((note) => {
      if(note.title.includes(query) || note.note.includes(query)){
        searchList.push(note);
      }
    })

    res.status(200).json({
      message:"Notes matching the query",
      searchList
    });
  }catch(e){
    console.log(e);
    res.status(500).json({
      message:"Internal server error"
    })
  }
});

app.delete('/notes/:id', userAuthentication, async (req,res) => {
  const noteId = req.params.id;
  console.log(noteId)
  const { username } = req.user;
  console.log(username)
  try{
    const note = await Note.findOne({
      _id:noteId, username
    });
    console.log(note)
    if(!note){
      return res.status(404).json({
        message:"Note not found"
      });
    }
    await note.deleteOne();
    res.status(200).json({
      message:"Note deleted successfully"
    })
  }catch (e){
    console.log(e);
    res.status(500).json({
      message:"Internal server error"
    })
  }
})

app.listen(3000, () => {
  console.log("Listening");
});
