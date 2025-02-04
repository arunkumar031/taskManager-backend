const express=require('express');
const bodyParser=require('body-parser');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
const sqlite3=require('sqlite3');
const {v4:uuidv4}=require('uuid');

const app=express();
app.use(bodyParser.json());

const db=new sqlite3.Database('./database.sqlite');

app.listen(3000, ()=>{
    console.log('Server is running on http://localhost:3000/');
});

//Signup API
app.post('/signup',(req,res)=>{
    const {username,email,password}=req.body;
    const hashedPassword=bcrypt.hashSync(password, 8);
    const userId=uuidv4();

    db.run(
        `INSERT INTO users (id,username,email,password) VALUES (?,?,?,?)`,
        [userId,username,email,hashedPassword],
        function(err){
            if (err) return res.status(500).send({message:err});
            const token=jwt.sign({id:userId},'secret_key',{expiresIn:86400});
            res.status(200).send({auth:true,token});
        }
    )
});

//Login API
app.post('/login',(req,res)=>{
    const {email,password}=req.body;

    db.get(
        `SELECT * FROM users WHERE email = ?`,[email], (err,user)=>{
            if (err || !user) return res.status(404).send({message: 'User not found'});

            const passwordIsValid=bcrypt.compareSync(password,user.password);
            if (!passwordIsValid) return res.status(401).send({auth:false,token:null});

            const token=jwt.sign({id:user.id},'secret_key',{expiresIn: 86400});
            res.status(200).send({auth:true,token});
        }
    )
})

//Middleware function
const verifyToken=(req,res,next)=>{
    const token=req.headers['authorization'];
    
    if (!token) return res.status(401).send({auth:false,message:'No token provided'});

    jwt.verify(token,'secret_key',(err,decoded)=>{
        if (err) return res.status(500).send({auth:false,message:'Falied to authenticate token'});
        req.userId=decoded.id;
        next();
    });
};

//Create Task API
app.post('/tasks',verifyToken,(req,res)=>{
    const {title,description}=req.body;
    const taskId=uuidv4();
    const userId=req.userId;

    db.run(
        `INSERT INTO tasks (id,user_id,title,description,status) VALUES (?,?,?,?,?)`,
        [taskId,userId,title,description,'pending'],
        function(err){
            if (err) return res.status(500).send({message:'Task creation failed'});
            res.status(200).send({message:'Task created successfully'});
        }
    )
})

//Get All API
app.get('/tasks',verifyToken,(req,res)=>{
    db.all(
        `SELECT * FROM tasks WHERE user_id=?`,[req.userId],(err,tasks)=>{
            if (err) return res.status(500).send({message:'Failed to load tasks'});
            res.status(200).send(tasks);
        }
    )
})

//Update Task API
app.put('/tasks/:id',verifyToken,(req,res)=>{
    const {title,description,status}=req.body;
    db.run(
        `UPDATE tasks SET title=?,description=?,status=? WHERE id=? AND user_id=?`,
        [title,description,status,req.params.id,req.userId],
        function(err){
            if (err) return res.status(500).send({message:'Falied to update task'});
            res.status(200).send({message:'Task updated successfully'});
        }
    )
})

//Delete Task API
app.delete('/tasks/:id',verifyToken,(req,res)=>{
    db.run(`DELETE FROM tasks WHERE id=? AND user_id=?`,
        [req.params.id,req.userId],
        function(err){
            if (err) return res.status(500).send({message:'Failed to delete task'});
            res.status(200).send({message:'Task deleted successfully'});
        }

    )
})