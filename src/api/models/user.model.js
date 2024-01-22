const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      min: 2,
      max: 100,
    },

    email: {
      type: String,
      required: true,
      max: 50,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      min: 6,
    },
    validation: {
      type: Boolean,
      default: true,
    },
    city: String,
    state: String,
    country: String,
    occupation: String,
    phoneNumber: String,
    transactions: Array,
    role: {
      type: String,
      enum: ["manager", "admin"],
      default: "manager",
    },
    isPayed: {
      type: Number,
      enum: [1, 2, 3],
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

module.exports = User;

UserSchema.methods.generateTokens = function () {
  const token = jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
      fullName: this.fullName,
      password: this.motDePasse,
    },
    process.env.ACTIVATION_TOKEN_SECRET,
    {
      expiresIn: "5m",
    }
  );
  return token;
};
