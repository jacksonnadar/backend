const express = require("express");
const router = express.Router();
const Register = require("../api/models/register");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const JwtToken = require("../api/models/jwttoken");
const bcrypt = require("bcryptjs");

const { check, validationResult } = require("express-validator");

router.get("/login", (req, res) => {
  console.log("session", "this is session " + req.session.current_url);
  res.render("login", { msg: "", url: req.session.current_url });
});

router.get("/register", (req, res) => {
  res.render("register", { msg: "", url: req.session.current_url });
});
router.post(
  "/register",
  [
    check("name")
      .isString()
      .isLength({ min: 6, max: 30 })
      .withMessage("name be at least 6 chars long"),
    check("email")
      .isString()
      .isLength({ max: 30 })
      .withMessage("you exceeded character limit (30)")
      .isEmail()
      .withMessage("must be a valid email"),
    check("password")
      .isString()
      .isLength({ min: 6, max: 30 })
      .withMessage("password be at least 6 chars long")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedpassword = await bcrypt.hash(req.body.password, salt);

    const register = new Register({
      _id: new mongoose.Types.ObjectId(),
      name: req.body.name,
      email: req.body.email,
      password: hashedpassword,
      date: Date.now()
    });

    const userexist = await Register.findOne({ email: req.body.email });

    if (userexist) {
      return res
        .status(400)
        .render("register", {
          msg: "Email already registerd",
          url: req.session.current_url
        });
    }

    result = register
      .save()

      .catch(err => {
        console.log(err);
      });
    res.redirect("/");
  }
);

//login
router.post(
  "/login",
  [
    check("email")
      .isString()
      .isLength({ max: 30 })
      .withMessage("you exceeded character limit (30)")
      .isEmail()
      .withMessage("must be a valid email"),
    check("password")
      .isString()
      .isLength({ min: 6, max: 30 })
      .withMessage("password be at least 6 chars long")
  ],
  async (req, res) => {
    const user = await Register.findOne({ email: req.body.email });

    if (!user) {
      return res.status(400).render("login", {
        msg: "your are not registered",
        url: req.session.current_url
      });
    }

    const validpass = await bcrypt.compare(req.body.password, user.password);
    if (!validpass) {
      return res.status(400).render("login", {
        msg: "worng password",
        url: req.session.current_url
      });
    }
    //jwt

    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
      expiresIn: "1h"
    });
    jwtToken = new JwtToken({
      _id: new mongoose.Types.ObjectId(),
      jwt: user._id,
      name: user.name,
      token: token,
      date: Date().now
    });
    const userexist = await JwtToken.deleteOne({ jwt: user._id });
    jwtToken.save();

    req.session.session_veryficatied = true;
    if (!req.session.current_url) {
      return res.redirect(`/home/${jwtToken._id}`);
    }
    res.redirect(`${req.session.current_url}/${jwtToken._id}`);
  }
);

//jwt db

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await JwtToken.deleteOne({ _id: id }).exec();
    req.session.session_veryficatied = false;
    res.send(result);
  } catch (err) {
    console.log(err);
    res.status(500).redirect(303, "/");
  }
});

module.exports = router;
