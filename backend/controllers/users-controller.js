const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const DUMMY_PLACES = [
  {
    id: "u1",
    name: "Yashdeep Bachhas",
    email: "yash@gmail.com",
    password: "1397",
  },
];

const getUsers = (req, res, next) => {
  res.json({ users: DUMMY_PLACES });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError("Invalid inputs passed.", 422);
    return next(error);
  }

  const { name, email, password, places } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Sign Up failed, try again later", 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("User Already Exists, login instead", 422);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZXomn4P8EXSe1QvO0P5jI_J7AHtOkXSPJJ2sX1QHwj8BgBUa8Sw&s",
    password,
    places,
  });

  try {
    await createdUser.save();
  } catch {
    const error = new HttpError("Sign Up failed, try again later", 500);
    return next(error);
  }
  res.status(201).json({ user: createdUser });
};

const login = (req, res, next) => {
  const { email, password } = req.body;

  const identifiedUser = DUMMY_PLACES.find((u) => u.email === email);
  if (!identifiedUser || identifiedUser.password !== password) {
    throw new HttpError("Wrong Credentials.", 401);
  }

  res.json({ message: "Logged in" });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
