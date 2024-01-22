const express = require('express') ; 

 
const userController = require("../controllers/user");

const router = express.Router();

const {auth} = require('../middlewares/auth.middleware')
const admin = require('../middlewares/admin.middleware');

router.post("/activate", userController.userController.activate);
router.post("/refreshtoken", userController.userController.getToken);
//router.post("/forgot", userController.userController.forgotPassword);
router.post("/resete", auth, userController.userController.resetPassword);
router.get("/", userController.userController.getUser);
router.get("/admin", [auth, admin], userController.userController.getUsers);
router.get("/logout", [auth], userController.userController.logout);
router.patch("/update", auth, userController.userController.update);
router.patch("/role/:id", [auth, admin], userController.userController.updateRole);
router.patch("/updatepayement/:id", userController.userController.updatePayement);
router.delete("/delete/:id", [auth, admin], userController.userController.delete);



router.post("/payment",userController.userController.payment);



router.post("/login", userController.userController.authentification);// localhost:5000/api/login
router.post("/register", userController.userController.inscription);
router.delete('/deleteAll',userController.userController.deleteAll)
router.get("/getAll",userController.userController.getAll)
// for forget password
router.post('/forgotPassword',userController.userController.passwordForgot)  // localhost:5000/api/forgotPassword
router.post('/updatePassword/:id/:token',userController.userController.updatePassord)

//for validation
router.patch('/validation/:email',userController.userController.validation)






module.exports = router;


