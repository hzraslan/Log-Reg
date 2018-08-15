var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt-as-promised');
const flash = require('express-flash');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());
var path = require('path');
app.use(express.static(path.join(__dirname, './static')));
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');
var sess = {
    secret: 'keyboard cat',
    cookie: {}
  }

  if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    sess.cookie.secure = true // serve secure cookies
  }

  app.use(session(sess))

mongoose.connect('mongodb://localhost/login_registeration');
mongoose.Promise = global.Promise;

var UserSchema = new mongoose.Schema({
    first_name:  { type: String, required: true, minlength: 2},
    last_name: { type: String, required: true, minlength: 2},
    birthday: { type: Date, required: true },
    email: { type: String, required: true,  unique : true, minlength: 6},
    password: { type: String, required: true, minlength: 6},
    comments: [{commentor:{type: String}, content:{type:String}, feedbacks: [{content: {type:String}}] }]

}, {timestamps: true });

   mongoose.model('User', UserSchema);
   var User = mongoose.model('User')


app.get('/', function(req, res) {
    res.render('index')
})
app.get('/dashboard', function(req, res) {
    var users = User.find({}, function(err, users){
        User.findById(req.session.user_id, function(err, user){
            if(err){
                console.log("everything went wrong")
            }else{

                res.render('users', {user: user, users: users});
            }
        })
    })

})
app.get('/user/:user_id/comment/:comment_id', function(req, res) {

    var users = User.find({}, function(err, users){

        User.findById(req.params.user_id, function(err, user){


                    if(err){
                        console.log("everything went wrong")
                    }else{
                        var my_user = User.findById(req.session.user_id, function(err){
                            var secret = user.comments.id(req.params.comment_id);
                            res.render('comment', {my_user: my_user, user: user, users: users, secret: secret});
                        })

                    }


        })
    })

})
app.post('/users/:user_id/secret/:secret_id/new_feedback', function(req, res){
    User.findById(req.params.user_id, function(err, user){

        if(err){
            console.log("everything went wrong")
        }else{
                var secret = user.comments.id(req.params.secret_id);
                secret.feedbacks.push({content:req.body.content});
                user.save(function(err){
                    return res.redirect('/user/'+user.id+ '/comment/'+secret.id);
                })


        }


    })
})
app.post('/users', function(req, res) {
    if(req.body.password === req.body.password_confirmation){
        User.findOne({email: req.body.email}, function(err, user){
            if(!user){
                user = new User();
                user.first_name = req.body.first_name;
                user.last_name = req.body.last_name;
                user.email = req.body.email;
                user.birthday = req.body.birthday;
                bcrypt.hash(req.body.password, 10)
                    .then(hashed_password => {
                        user.password = hashed_password;
                        user.save( err, user =>{
                            if(err){
                                console.log(err)
                            }else{
                                req.session.user_id = user._id;
                                req.session.email = user.email;
                                req.session.name = user.first_name;
                                return res.redirect('/dashboard');

                            }
                        })
                    })
                    .catch(error => {

                    });
            }else{
                console.log('user already exist!');
                return res.redirect('/');
            }

        })
    }else{
        console.log("passwords don't match");
        return res.redirect('/');
    }
})
app.post('/sessions', (req, res) => {
    // console.log(req.body);
    User.findOne({email:req.body.email}, (err, user) => {
        if (err) {
            console.log(err);
            return res.redirect('/');
        }
        if(user) {
           bcrypt.compare(req.body.password, user.password)
                .then(result =>{
                    console.log(result);
                    console.log('logged in ');
                    req.session.user_id = user.id;
                    req.session.email = user.email;
                    req.session.name = user.first_name;
                    return res.redirect('/dashboard');
                })
                .catch(err =>{
                    console.log(errror);
                });

        }
    })
})
app.post('/users/:id/secret', function(req, res) {
    console.log("POST DATA", req.body);
    // var user = User.findById(req.body.id)
    // var comment = new Comment({commentor: user._id, content: req.body.content});
    // user.save(function(err, data) {
    //   if(err) {
    //     console.log('something went wrong');
    //     console.log(err);
    //     return res.redirect('/dashboard');
    //   } else {
    //       console.log(data)

        User.findOneAndUpdate({_id: req.params.id}, {$push: {comments: {content: req.body.content, commentor:req.params.id}}}, function(err, data){
            if(err){
                console.log('something went wrong again and again');
                return res.redirect('/dashboard');
            }
            else {
                console.log(data)
                return res.redirect('/dashboard');

            }
       })

    //   }
    // })
  })
app.get('/users/:user_id/secret/:comment_id', (req, res)=>{
    User.findByIdAndUpdate({_id: req.params.user_id}, {$pull: {comments:{_id: req.params.comment_id}}}, function(err){
        if(err){
            console.log("i can not do that!");
        }else{
            return res.redirect('/dashboard')
        }
    })

})
app.post('/sessions/clear', (req, res)=>{
    req.session.destroy(function(err){
        if(err){
            console.log(err);
        }else{
            console.log("logging out");
            return res.redirect('/');
        }
    });

})

app.listen(8000, function() {
    console.log("listening on port 8000");
})
