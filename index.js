const express=require('express');
const app=express();
const port=process.env.PORT || 8080;;
const cors = require('cors')

app.use(cors());


app.get('/', (req, res)=>{
    res.send('Hello World');
});

app.listen(port, ()=>{
    console.log("Server started at port "+port );
});