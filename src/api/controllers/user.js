const User = require("../models/user.model.js");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const URL = process.env.CLIENT_URL;
const sendgrid = require("@sendgrid/mail");
//const { findByIdAndUpdate, findOneAndUpdate } = require("../models/user.model.js");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);
sendgrid.setApiKey(process.env.api_keys);

// const headers = {
//   Authorization: `Bearer ${process.env.STRIPE_SECRET_TEST}`
// };
// console.log('process.env.STRIPE_SECRET_TEST', process.env.STRIPE_SECRET_TEST)

const transporter = nodemailer.createTransport(
  sendgridTransport({
    service: "hotmail",
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.user,
      pass: process.env.password,
      api_key:
        "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",
    },
  })
);

const userController = {
  inscription: async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
      if (!fullName && !email && !password) {
        return res
          .status(204)
          .json({ status: "failed", message: "Invalid data." });
      }
      if (
        !/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
          email
        )
      ) {
        return res
          .status(405)
          .json({ status: "failed", message: "Invalid emails." });
      }

      const user = await User.findOne({ email });
      if (user)
        return res
          .status(406)
          .json({ status: "failed", message: "This email already exists." });

      if (password.length < 6)
        return res.status(400).json({
          status: "failed",
          message: "Password must be at least 6 characters.",
        });

      const mdb = await bcrypt.hash(password, 12);

      //console.log(password)
      //console.log('mdp', password)
      // const newUser = new User({
      //   password,
      //   fullName,
      //   email,
      // });

      // Create token
      const activation_token = jwt.sign(
        { email: email },
        process.env.ACTIVATION_TOKEN_SECRET,
        {
          expiresIn: "2h",
        }
      );
      req.body.password = mdb;
      const newUser = await User.create(req.body);
      const { isPayed, _id, role, createdAt } = newUser;
      //newUser.token = activation_token
      return res.status(201).json({
        message: "Registration completed successfully",
        data: { isPayed, _id, fullName, email, role, createdAt },
        token: activation_token,
      });

      // const activation_token = newUser.generateTokens();

      // console.log(`activation_token`, activation_token);

      // const url = `${process.env.CLIENT_URL}/user/activate/${activation_token}`;
      // try {
      // //   transporter.sendMail({
      // //     to: email,
      // //     from: "amarichezineddine@outlook.com",
      // //     subject: "BIGNOVA-backoffice activation du compte",
      // //     html: `
      // //     <div style="max-width: 700px; margin:auto; border: 10px solid #ddd; padding: 50px 20px; font-size: 110%;">
      // //     <h2 style="text-align: center; text-transform: uppercase;color: teal;">Bienvenue à BIGNOVA✮.</h2>
      // //     <p>Toutes nos félicitations! Vous êtes presque prêt à commencer à utiliser BIGNOVA✮.<br>
      // //     Cliquez simplement sur le bouton ci-dessous pour valider votre adresse e-mail.
      // //     </p>

      // //     <a href=${url} style="background: crimson; text-decoration: none; color: white; padding: 10px 20px; margin: 10px 0; display: inline-block ; ">aller</a>

      // //     <p>Si le bouton ne fonctionne pas pour une raison quelconque, vous pouvez également cliquer sur le lien ci-dessous:</p>

      // //     <div>${url}</div>
      // //     </div>
      // // `,
      // //   });
      //   // console.log("token", activation_token);
      //   res.status(400)
      //   .json({
      //     status: "SUCCESS",
      //     message:
      //       "félicitations inscription réussi ! Veuillez activer votre compte pour commencer",
      //     token: activation_token,
      //     url
      //   });
      // } catch (error) {
      //   console.log(error);
      //   return res.status(500).json({ status: "failed", message: error.message });
      // }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "failed", message: error.message });
    }
  },
  activate: async (req, res) => {
    try {
      const { activation_token } = req.body;

      const user = jwt.verify(
        activation_token,
        process.env.ACTIVATION_TOKEN_SECRET
      );
      const { email } = user;

      console.log(`user`, user);
      const check = await User.findOne({ email });
      if (check)
        return res
          .status(400)
          .json({ status: "failed", message: "This email already exists." });

      const newUser = new User({
        id: user.user_id,
        fullName: user.fullName,
        email: user.email,
        password: user.password,
      });

      await newUser.save();

      // console.log(`newUser`, newUser);
      res.json({ status: "Success", message: "Account has been activated!" });
    } catch (err) {
      return res.status(501).json({ status: "failed", message: err.message });
    }
  },
  authentification: async (req, res) => {
    const { password, email } = req.body;
    try {
      const userEmail = await User.findOne({ email });

      if (!userEmail)
        return res
          .status(400)
          .json({ status: "failed", message: "Cet utilisateur n'existe pas." });

      const isMatch = await bcrypt.compare(password, userEmail.password);
      if (!isMatch)
        return res.status(400).json({
          status: "failed",
          message: "Le mot de passe est incorrect.",
        });
      const refresh_token = createRefreshToken({ id: userEmail._id });
      let options = {
        path: "/user/refreshtoken",
        sameSite: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true, // The cookie only accessible by the web server
      };
      const { isPayed, _id, fullName, role, createdAt } = userEmail;

      res.cookie("x-access-token", refresh_token, options).status(200).json({
        message: "Connection completed successfully",
        data: { isPayed, _id, fullName, email, role, createdAt },
        token: refresh_token,
      });
    } catch (error) {
      console.log(error);
    }
  },
  getToken: (req, res) => {
    try {
      // const rf_token = req.cookie['x-access-token'];

      const rf_token = req.cookies["x-access-token"];
      // const rf_token = req.cookies.refreshtoken;

      console.log("first", rf_token);
      if (!rf_token)
        return res
          .status(400)
          .json({ message: "no token, Please login now !" });
      // console.log(`rf_token`, rf_token);
      jwt.verify(rf_token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(400).json({ message: "Please login now!" });

        const access_token = createAccessToken({ id: user.id });

        res.json({ access_token });
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await Client.findOne({ email });
      if (!user)
        return res.status(400).json({ message: "Cet e-mail n'existe pas." });

      const access_token = createAccessToken({ id: user._id });
      const url = `${CLIENT_URL}/user/reset/${access_token}`;

      try {
        transporter.sendMail({
          to: email,
          from: "insigned11@gmail.com",
          subject: "BIGNOVA-DELIV mot de passe oublié ",
          html: `
            <div style="max-width: 700px; margin:auto; border: 10px solid #ddd; padding: 50px 20px; font-size: 110%;">
            <h2 style="text-align: center; text-transform: uppercase;color: teal;">Bienvenue à BIGNOVA✮DELIV.</h2>
            <p> BIGNOVA✮DELIV.<br>
            Cliquez simplement sur le bouton ci-dessous pour réinitialiser votre mot de passe.
            </p>
            
            <a href=${url} style="background: crimson; text-decoration: none; color: white; padding: 10px 20px; margin: 10px 0; display: inline-block ; ">aller</a>
        
            <p>Si le bouton ne fonctionne pas pour une raison quelconque, vous pouvez également cliquer sur le lien ci-dessous:</p>
        
            <div>${url}</div>
            </div>
        `,
        });
        res.json({
          status: "SUCCESS",
          message: "félicitations lien envoyer  ! Veuillez verfier votre email",
        });

        console.log(`access_token_forPassword`, access_token);
      } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
      }
      // res.json({ message: "Re-send the password, please check your email." })
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  resetPassword: async (req, res) => {
    try {
      const { motDePasse } = req.body;
      console.log(motDePasse);

      const passwordHash = await bcrypt.hash(motDePasse, 12);
      const token = req.headers["x-access-token"];

      decodeData = jwt.verify(token, process.env.ACCESS_TOKEN);
      req.userId = decodeData?.id;

      //console.log(`ruser.ids`, {id :user.id})
      await Client.findOneAndUpdate(req.userId, {
        motDePasse: passwordHash,
      });

      res.json({ message: "Password successfully changed!" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  getUser: async (req, res) => {
    try {
      const token = req.headers["x-access-token"];
      //const token = req.headers.refreshtoken
      // console.log(`token getUserInfo`, token)
      decodeData = jwt.verify(token, process.env.ACCESS_TOKEN);
      req.userId = decodeData?.id;

      const user = await Client.findById(req.userId).select("-motDePasse");

      res.json(user);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  getUsers: async (req, res) => {
    try {
      const users = await Client.find().select("-password");

      res.json(users);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  logout: async (req, res) => {
    try {
      res.clearCookie("x-access-token", { path: "/user/refreshtoken" });
      return res.json({ message: "Logged out." });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  update: async (req, res) => {
    try {
      const { fullName, avatar } = req.body;
      await Client.findOneAndUpdate(
        { _id: req.user.id },
        {
          fullName,
          avatar,
        }
      );

      res.json({ message: "Update Success!" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  updateRole: async (req, res) => {
    try {
      const { role } = req.body;

      await User.findOneAndUpdate(
        { _id: req.params.id },
        {
          role,
        }
      );

      res.json({ message: "Update Success!" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  updatePayement: async (req, res) => {
    try {
      const { isPayed } = req.body;

      await User.findOneAndUpdate(
        { _id: req.params.id },
        {
          isPayed,
        }
      );
      const userEmail = await User.findById(req.params.id);
      // console.log('userEmail', userEmail)

      const {   _id,fullName, role, createdAt,email } = userEmail;
      res.json({
        message: "Update Success!",
         data: { isPayed, _id, fullName, email, role, createdAt },
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  delete: async (req, res) => {
    try {
      await Client.findByIdAndDelete(req.params.id);

      res.json({ message: "Deleted Success!" });
      // console.log(`message`, message)
    } catch (err) {
      return console.log(`err`, err);
      // res.status(500).json({ message: err.message });
    }
  },
  getAll: async (req, res) => {
    const users = await User.find({});
    return res.status(200).json({ users });
  },
  deleteAll: async (req, res) => {
    try {
      await User.deleteMany({});
      return res.status(200).json({ msg: "delete all users" });
    } catch (error) {
      console.log(error.message);
    }
  },
  passwordForgot: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ message: "Cet e-mail n'existe pas." });

      const secret = process.env.ForgetPasswordSecret + user.password;
      const payload = {
        email: user.email,
        id: user.id,
      };
      const token = jwt.sign(payload, secret, { expiresIn: "15m" });
      const link = `http://localhost:5000/api/updatePassword/${user.id}/${token}`;

      // send link to email

      const message = {
        to: user.email,
        from: "rarahim63@gmail.com",
        subject: "Update Password ",
        html: `click in this link to update your password ${link} `,
      };
      sendgrid
        .send(message)
        .then(() => res.status(200).json({ message: link }))
        .catch((error) => res.status(400).json({ message: error.message }));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
  updatePassord: async (req, res) => {
    try {
      const { id, token } = req.params;

      const userWithId = await User.findById(req.params.id);

      if (!userWithId) return res.status(400).json({ message: "invalid link" });

      const secret = process.env.ForgetPasswordSecret + userWithId.password;

      try {
        const payload = jwt.verify(token, secret);
      } catch (error) {
        return res.status(400).json({ message: "invalid link" });
      }

      const { password, confirmPassword } = req.body;
      if (password != confirmPassword)
        return res.status(400).json({ msg: "error in password" });

      const passwordHash = await bcrypt.hash(password, 12);

      try {
        await User.findByIdAndUpdate(userWithId.id, { password: passwordHash });
      } catch (error) {
        return res.status(400).json({ msg: error.message });
      }

      return res.status(200).json({ msg: "password update successefuly" });
    } catch (error) {
      res.status(400).json({ msg: error.msg });
    }
  },
  validation: async (req, res) => {
    try {
      const { email } = req.params;
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ msg: "email does not exists" });

      await User.findByIdAndUpdate(user.id, {
        validation: req.body.validation,
      });

      res.status(200).json({ msg: "validation update successefuly" });
    } catch (error) {
      return res.status(400).json({ msg: error.msg });
    }
  },
  payment: async (req, res) => {
    let { amount, id  } = req.body;

    let data = {
      amount,
      currency: "USD",
      description: "E-learning company",
      payment_method: id,
      confirm: true,
    };

    try {
      const payment = await stripe.paymentIntents.create(data);
   
      console.log("Payment", payment);
      res.json({
        message: "Payment successful",
        success: true,
      });
    } catch (error) {
      console.log("Error", error);
      res.json({
        message: error.raw.message,
        success: false,
        status: error.statusCode,
      });
    }
  },
};

const createActivationToken = ({ payload }) => {
  return jwt.sign({ payload }, process.env.ACTIVATION_TOKEN_SECRET, {
    expiresIn: "5m",
  });
};
const createAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN, { expiresIn: "15m" });
};
const createRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

exports.userController = userController;
