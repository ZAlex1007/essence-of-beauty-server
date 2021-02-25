const express=require('express');
const app=express();
const cors = require('cors');
const bcrypt=require('bcrypt');


// Use req.body on post requsts
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json()

const port=process.env.PORT || 8080;

// Use functions from other urls
app.use(cors());

app.listen(port, ()=>{
  console.log("Server started at port "+port );
});

// DB connection
const {MongoClient, ObjectId} = require('mongodb');
const uri = "mongodb+srv://alex:candvreodata@eob.68hds.mongodb.net/eob?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true } );

let _db;
client.connect(err =>{ _db=client.db("eob") });


// Routes


// ***********
// Product routes
// ***********

app.get('/products/show/:id', (req, res) =>{
  _db.collection('products').find( { _id: ObjectId(req.params.id) } ).toArray((err, result) => res.json({ result}));
});

app.get('/products/:pageNum/:itemsPerPage/:category?/:dir?/:orderBy?/:search?/', (req, res) =>{
   const {pageNum, category, itemsPerPage, dir, orderBy, search} = req.params;
   let filter={}; let sort= {};
   
   // Construct the query params
   if(category != 'All') filter={ category: category}
   if(search != undefined) filter["name"]=new RegExp(search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "gi");
   if(dir != 0 || orderBy!='none') sort[orderBy]=parseInt(dir); // if dir is 0, we don t need to sort

  _db.collection('products').find( filter ).sort(sort).skip(parseInt(itemsPerPage)*(parseInt(pageNum)-1)).limit(parseInt(itemsPerPage)).toArray((err, results) => res.json({results}));
});



app.post('/products/create', jsonParser, (req, res)=>{
  let body=req.body;
  _db.collection('products').insertOne(body);
  res.send("Product created");
});

app.put('/products/update/:id', jsonParser, (req, res)=>{
    let body=req.body;
    _db.collection('products').updateOne(
      { _id: ObjectId(req.params.id) },
      {$set:{
        name: body.name,
        description: body.description,
        category: body.category,
        stock: body.stock,
        price: body.price,
      }});
    res.send("Product updated");
});

app.delete('/products/delete/:id', (req, res)=>{
    _db.collection('products').deleteOne(
      { _id: ObjectId(req.params.id) }
    );
    res.send("Product deleted");
});

// ***********
// Auth routes
// ***********

app.post('/register', jsonParser, async (req, res)=>{
    let body=req.body;

    const user= await _db.collection('users').find( {email: body.email} ).toArray();
    if(user.length!=0){
      res.json({status: "error", message:"There is already an account with this email registered"});
      return;
    }

    bcrypt.hash(body.password, 10, (err, hash) => {
      _db.collection('users').insertOne({
        fullName: body.fullName,
        password: hash,
        email: body.email,
        adress: body.adress,
        adminPermission: false
      });
    });
});

app.post('/login', jsonParser, async (req,res)=>{
    let body=req.body;
    const user= await _db.collection('users').find( {email: body.email} ).toArray();
    if(user.length==0){
      res.json({status:"error", message: "Email or password is incorrect!"});
      return;
    }
    bcrypt.compare(body.password, user[0].password, (err, result)=>{
      if(result){
        delete user[0].password
        res.json({status:"success", user: user[0], message: "Logged in successfully!"});
      }
      else res.json({status:"error", message: "Email or password is incorrect!"});
    });
});


// Dashboard routes

app.get('/:coll/count', (req,res)=>{
    let collName=req.params.coll;
    let collCount=_db.collection(collName).countDocuments({}).then( count =>res.json(count))
});
app.get('/users/search/:searchString', async (req,res)=>{
    let searchString=new RegExp(req.params.searchString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "gi");
    let users= await _db.collection("users").find({ fullName: searchString}).toArray();
    res.json(users);
});
app.put('/users/admin/:id', jsonParser, (req,res)=>{
    let adminValue=req.body.value;
    _db.collection('users').updateOne(
      { _id: ObjectId(req.params.id) },
      {$set:{
        adminPermission: adminValue,
      }});
});